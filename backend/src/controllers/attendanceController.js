const prisma = require('../config/db');

// Haversine formula to calculate distance between two coordinates in meters
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; // Distance in m
  return d;
}

const clockIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.body;

    // Check Geofencing if coordinates are provided and required
    const officeLat = parseFloat(process.env.OFFICE_LATITUDE);
    const officeLng = parseFloat(process.env.OFFICE_LONGITUDE);
    const radius = parseFloat(process.env.OFFICE_RADIUS_METERS || 500);

    let isSuspicious = false;
    
    if (officeLat && officeLng && latitude && longitude) {
      const distance = getDistanceFromLatLonInM(officeLat, officeLng, latitude, longitude);
      if (distance > radius) {
        isSuspicious = true;
      }
    } else if (officeLat && officeLng && (!latitude || !longitude)) {
      // If office has coordinates but employee didn't provide them, mark suspicious
      isSuspicious = true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    const existing = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: userId,
          date: today
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already clocked in for today' });
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        date: today,
        checkIn: new Date(),
        status: isSuspicious ? 'Absent' : 'Present', // Flag as Absent if suspicious location
        latitude: latitude || null,
        longitude: longitude || null
      }
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const clockOut = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: userId,
          date: today
        }
      }
    });

    if (!existing) {
      return res.status(400).json({ error: 'Not clocked in today' });
    }
    
    if (existing.checkOut) {
      return res.status(400).json({ error: 'Already clocked out today' });
    }

    const checkOutTime = new Date();
    
    // Calculate work hours
    const diffMs = checkOutTime - new Date(existing.checkIn);
    const diffHrs = diffMs / (1000 * 60 * 60);

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: checkOutTime,
        workHours: diffHrs
      }
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const records = await prisma.attendance.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: 30
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const records = await prisma.attendance.findMany({
      where: { date: today },
      include: {
        user: {
          select: { displayName: true, department: true, avatar: true }
        }
      }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  clockIn,
  clockOut,
  getMyAttendance,
  getTodayAttendance
};
