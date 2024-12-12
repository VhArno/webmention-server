const axios = require('axios');
const cheerio = require('cheerio');

const webmentions = [];

// GET: Fetch all stored Webmentions
async function getWebMentions(req, res) {
    try {
        res.status(200).json(webmentions);
    } catch (error) {
        res.status(400).json({ error: 'Failed to retrieve webmentions' });
    }
}

// POST: Handle incoming Webmentions
async function postWebmentions(req, res) {
    try {
        const { source, target } = req.body;

        // Validate input
        if (!source || !target) {
            return res.status(400).json({ error: 'source and target are required' });
        }

        if (!isValidUrl(source) || !isValidUrl(target)) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        if (!isTargetOurs(target)) {
            return res.status(404).json({ error: 'Target is not managed by this server' });
        }

        // Fetch and parse the source URL
        try {
            const response = await axios.get(source);
            const $ = cheerio.load(response.data);

            if (!$(`a[href="${target}"]`).length) {
                return res.status(400).json({ error: 'Source does not link to target' });
            }
        } catch (error) {
            return res.status(400).json({ error: 'Failed to fetch source or source is inaccessible' });
        }

        // Store the Webmention
        webmentions.push({ source, target, timestamp: new Date().toISOString() });
        console.log(webmentions);

        res.status(202).json({ message: 'Webmention accepted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' +error });
    }
}

// DELETE: (Optional) Clear all Webmentions (or a specific one by ID)
async function deleteWebmentions(req, res) {
    try {
        const { source, target } = req.query;

        if (source || target) {
            // Remove matching webmentions
            const initialLength = webmentions.length;
            webmentions = webmentions.filter(
                mention => mention.source !== source && mention.target !== target
            );
            const deletedCount = initialLength - webmentions.length;

            return res.status(200).json({ message: `Deleted ${deletedCount} webmentions` });
        }

        // Clear all if no specific query
        webmentions.length = 0;
        res.status(200).json({ message: 'All webmentions deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to delete webmentions' });
    }
}

// Helper: Validate URL format
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Helper: Check if the target belongs to your site
function isTargetOurs(target) {
    const targetHost = new URL(target).host;
    return targetHost === 'localhost:3000'; // Replace with your actual domain
}
  
module.exports = {
    getWebMentions,
    postWebmentions,
    deleteWebmentions,
};
