const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/reports - List all active reports
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch reports' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reports - Submit a new report
router.post('/', async (req, res) => {
  try {
    const { title, description, location, category } = req.body;
    
    if (!title || !description || !location || !category) {
      return res.status(400).json({ 
        error: 'title, description, location, and category are required' 
      });
  }

    const { data, error } = await supabase
      .from('reports')
      .insert([{
        title,
        description,
        location,
        category,
        upvotes: 0,
        downvotes: 0,
        status: 'active'
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to create report' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/reports/:id/upvote - Upvote a report
router.patch('/:id/upvote', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current report
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('upvotes')
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (fetchError || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update upvotes
    const { data, error } = await supabase
      .from('reports')
      .update({ upvotes: report.upvotes + 1 })
      .eq('id', id)
      .select('upvotes, expires_at')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to upvote report' });
    }

    res.json({ success: true, upvotes: data.upvotes, expires_at: data.expires_at });
  } catch (error) {
    console.error('Error upvoting report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/reports/:id/downvote - Downvote a report
router.patch('/:id/downvote', async (req, res) => {
  try {
  const { id } = req.params;
    
    // Get current report
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('downvotes')
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (fetchError || !report) {
    return res.status(404).json({ error: 'Report not found' });
  }

    const newDownvotes = report.downvotes + 1;

    if (newDownvotes >= 3) {
      // Delete the report from the database
      const { error: deleteError } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);
      if (deleteError) {
        console.error('Supabase error:', deleteError);
        return res.status(500).json({ error: 'Failed to delete report' });
      }
      return res.json({ success: true, downvotes: newDownvotes, deleted: true });
    }

    // Otherwise, just update downvotes
    const { data, error } = await supabase
      .from('reports')
      .update({ downvotes: newDownvotes })
      .eq('id', id)
      .select('downvotes, status')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to downvote report' });
    }

    const deleted = data.status === 'removed';
    res.json({ 
      success: true, 
      downvotes: data.downvotes, 
      deleted 
    });
  } catch (error) {
    console.error('Error downvoting report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/reports - Clear all reports (admin function)
router.delete('/', async (req, res) => {
  try {
    const { error } = await supabase
      .from('reports')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to clear reports' });
    }

    res.json({ success: true, message: 'All reports cleared' });
  } catch (error) {
    console.error('Error clearing reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 