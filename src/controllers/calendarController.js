const prisma = require('../lib/prisma');

// Get all calendar events (optional date range: ?from=ISO&to=ISO)
const getAllEvents = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};

    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            lastName: true,
          },
        },
      },
    });

    res.status(200).json({
      message: 'Events retrieved successfully',
      events,
    });
  } catch (error) {
    console.error('Get all calendar events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single event by ID
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const eventId = parseInt(id);

    if (isNaN(eventId)) {
      res.status(400).json({ error: 'Invalid event ID' });
      return;
    }

    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            lastName: true,
          },
        },
      },
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.status(200).json({
      message: 'Event retrieved successfully',
      event,
    });
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new calendar event
const createEvent = async (req, res) => {
  try {
    const { title, description, timestamp } = req.body;
    const userId = req.user?.id;

    if (!title || !timestamp) {
      res.status(400).json({ error: 'Title and timestamp are required' });
      return;
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: description || null,
        timestamp: new Date(timestamp),
        createdById: userId || null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Event created successfully',
      event,
    });
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an existing calendar event
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const eventId = parseInt(id);
    const { title, description, timestamp } = req.body;

    if (isNaN(eventId)) {
      res.status(400).json({ error: 'Invalid event ID' });
      return;
    }

    const existing = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (timestamp !== undefined) data.timestamp = new Date(timestamp);

    const event = await prisma.calendarEvent.update({
      where: { id: eventId },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            lastName: true,
          },
        },
      },
    });

    res.status(200).json({
      message: 'Event updated successfully',
      event,
    });
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a calendar event
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const eventId = parseInt(id);

    if (isNaN(eventId)) {
      res.status(400).json({ error: 'Invalid event ID' });
      return;
    }

    const existing = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    await prisma.calendarEvent.delete({
      where: { id: eventId },
    });

    res.status(200).json({
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get the single calendar color config (or default)
const getColorConfig = async (req, res) => {
  try {
    let config = await prisma.calendarColorConfig.findFirst({
      orderBy: { id: 'asc' },
    });

    if (!config) {
      const now = new Date();
      config = {
        id: 0,
        colorStartDate: now,
        colorOne: '#ef4444',
        colorTwo: '#22c55e',
        updatedAt: now,
      };
    }

    res.status(200).json({
      message: 'Color config retrieved successfully',
      config: {
        id: config.id,
        colorStartDate: config.colorStartDate,
        colorOne: config.colorOne,
        colorTwo: config.colorTwo,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get color config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upsert calendar color config (single row)
const updateColorConfig = async (req, res) => {
  try {
    const { colorStartDate, colorOne, colorTwo } = req.body;

    if (!colorStartDate) {
      res.status(400).json({ error: 'colorStartDate is required' });
      return;
    }

    const data = {
      colorStartDate: new Date(colorStartDate),
      ...(colorOne !== undefined && { colorOne }),
      ...(colorTwo !== undefined && { colorTwo }),
    };

    const existing = await prisma.calendarColorConfig.findFirst({
      orderBy: { id: 'asc' },
    });

    let config;
    if (existing) {
      config = await prisma.calendarColorConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      config = await prisma.calendarColorConfig.create({
        data: {
          colorStartDate: data.colorStartDate,
          colorOne: data.colorOne ?? '#ef4444',
          colorTwo: data.colorTwo ?? '#22c55e',
        },
      });
    }

    res.status(200).json({
      message: 'Color config updated successfully',
      config: {
        id: config.id,
        colorStartDate: config.colorStartDate,
        colorOne: config.colorOne,
        colorTwo: config.colorTwo,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update color config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getColorConfig,
  updateColorConfig,
};
