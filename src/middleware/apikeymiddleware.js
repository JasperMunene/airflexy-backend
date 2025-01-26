import { supabase } from '../config/supabaseConfig.js'; 

const apiKeyMiddleware = async (req, res, next) => {
  const apiKey = req.query.apikey || req.headers['x-api-key'];  
  
  if (!apiKey) {
    return res.status(401).json({ message: 'API key is required' });
  }

  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .single();

    if (error || !data) {
      return res.status(403).json({ message: 'Invalid API key' });
    }

    next();  
  } catch (err) {
    console.error('Error validating API key:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export default apiKeyMiddleware;
