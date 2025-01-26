import express from 'express';
import { supabase } from '../config/supabaseConfig.js'; 

const router = express.Router();

router.get('/', async (req, res) => {
    const {
      page = 1,
      limit = 10,
      sort = 'listed_at',
      order = 'desc',
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
  
    const offset = (page - 1) * limit;
  
    try {
      let query = supabase
        .from('properties')
        .select(
          `*, 
           images(property_id, image_url)` 
        )
        .range(offset, offset + limit - 1)
        .order(sort, { ascending: order === 'asc' });
  
      if (city) query = query.eq('city', city);
      if (min_price) query = query.gte('price', parseFloat(min_price));
      if (max_price) query = query.lte('price', parseFloat(max_price));
      if (status) query = query.eq('status', status);
      if (amenities) query = query.contains('amenities', amenities.split(','));
      if (furnished !== undefined) query = query.eq('furnished', furnished === 'true');
      if (availability_date) query = query.gte('availability_date', availability_date);
      if (min_floor) query = query.gte('floor_number', parseInt(min_floor, 10));
      if (max_floor) query = query.lte('floor_number', parseInt(max_floor, 10));
  
      const { data: properties, error, count } = await query;
  
      if (error) throw error;
  
      
      const formattedProperties = properties.map((property) => ({
        ...property,
        images: property.images ? property.images.map((img) => img.image_url) : [], // Extract image URLs
      }));
  
      // Return paginated response with metadata
      res.status(200).json({
        data: formattedProperties,
        meta: {
          total: count,
          page: parseInt(page, 10),
          per_page: parseInt(limit, 10),
          total_pages: Math.ceil(count / limit),
        },
      });
    } catch (err) {
      console.error('Error fetching properties:', err.message);
      res.status(500).json({ message: 'Failed to fetch properties' });
    }
  });
  
  


export default router;
