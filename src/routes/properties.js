import { Router } from "express";
import upload from "../utils/multer.js";
import { Queue } from "bullmq";
import { supabase } from "../config/supabaseConfig.js";
import geohash from "ngeohash";

// Create a BullMQ queue for image uploads
const queue = new Queue("image-upload", {
  redis: { host: "localhost", port: 6379 },
});

const router = Router();

// GET route to fetch properties
router.get("/", async (req, res) => {
  const {
    page = "1",
    limit = "10",
    sort = "listed_at",
    order = "desc",
    city,
    min_price,
    max_price,
    status,
    amenities,
    furnished,
    availability_date,
    min_floor,
    max_floor,
  } = req.query;

  // Convert pagination values to numbers
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = supabase
      .from("properties")
      .select(
        `*, 
         images(property_id, image_url)`
      )
      .range(offset, offset + limitNum - 1)
      .order(sort, { ascending: order === "asc" });

    if (city) query = query.eq("city", city);
    if (min_price) query = query.gte("price", parseFloat(min_price));
    if (max_price) query = query.lte("price", parseFloat(max_price));
    if (status) query = query.eq("status", status);
    if (amenities)
      query = query.contains("amenities", (amenities).split(","));
    if (furnished !== undefined)
      query = query.eq("furnished", furnished === "true");
    if (availability_date) query = query.gte("availability_date", availability_date);
    if (min_floor)
      query = query.gte("floor_number", parseInt(min_floor, 10));
    if (max_floor)
      query = query.lte("floor_number", parseInt(max_floor, 10));

    const { data: properties, error, count } = await query;

    if (error) throw error;

    const formattedProperties = properties.map((property) => ({
      ...property,
      images: property.images ? property.images.map((img) => img.image_url) : [],
    }));

    res.status(200).json({
      data: formattedProperties,
      meta: {
        total: count,
        page: pageNum,
        per_page: limitNum,
        total_pages: Math.ceil(count / limitNum),
      },
    });
  } catch (err) {
    console.error("Error fetching properties:", err.message);
    res.status(500).json({ message: "Failed to fetch properties" });
  }
});

// POST route to create a new property and process its images
router.post("/", upload.array("images"), async (req, res) => {
  try {
    const {
      user_id,
      property_type_id,
      title,
      description,
      price,
      address,
      city,
      county,
      country,
      longitude,
      latitude,
      bedrooms,
      bathrooms,
      area,
      floor_number,
      amenities,
      furnished,
      availability_date,
      status,
    } = req.body;

    // Validate required fields
    if (
      !property_type_id ||
      !title ||
      !price ||
      !address ||
      !city ||
      !county ||
      !country
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: property_type_id, title, price, address, city, county, and country are required.",
      });
    }

    // Calculate geohash if latitude and longitude are provided
    let computedGeohash = null;
    if (latitude && longitude) {
      computedGeohash = geohash.encode(
        parseFloat(latitude),
        parseFloat(longitude),
        12
      );
    }

    // Construct the property data object
    const propertyData = {
      user_id,
      property_type_id,
      title,
      description,
      price: parseFloat(price),
      address,
      city,
      county,
      country,
      longitude: longitude ? parseFloat(longitude) : null,
      latitude: latitude ? parseFloat(latitude) : null,
      geohash: computedGeohash,
      bedrooms: bedrooms !== undefined ? parseInt(bedrooms, 10) : undefined,
      bathrooms: bathrooms !== undefined ? parseInt(bathrooms, 10) : undefined,
      area: area !== undefined ? parseFloat(area) : undefined,
      floor_number:
        floor_number !== undefined ? parseInt(floor_number, 10) : undefined,
      amenities, // Expecting an array of strings (or a comma-separated string)
      furnished:
        typeof furnished === "boolean" ? furnished : furnished === "true",
      availability_date,
      status,
    };

    // Remove keys with undefined values to let database defaults apply
    Object.keys(propertyData).forEach((key) => {
      if (propertyData[key] === undefined) delete propertyData[key];
    });

    // Insert the new property into the properties table
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .insert([propertyData])
      .select()
      .single();

    if (propertyError) {
      throw propertyError;
    }

    // If images were uploaded via multer, enqueue them for Cloudinary processing
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const imagePaths = req.files.map((file) => file.path);
      
      await queue.add("image-upload", {
        imagePaths,
        userId: user_id,
        propertyId: property.property_id,
      });
    }

    res.status(201).json({
      message: "Property created successfully",
      data: property,
    });
  } catch (error) {
    console.error("Error creating property:", error.message);
    res.status(500).json({ message: "Failed to create property" });
  }
});

export default router;
