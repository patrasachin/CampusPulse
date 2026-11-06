const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const { requireAuth, requireOrganizer } = require('../middleware/auth');

const router = express.Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validId = (id) => mongoose.isValidObjectId(id);

function present(ev, userId) {
  const o = ev.toObject ? ev.toObject() : ev;
  const attendees = o.attendees || [];
  return {
    id: o._id,
    title: o.title,
    description: o.description,
    category: o.category,
    venue: o.venue,
    date: o.date,
    time: o.time,
    capacity: o.capacity,
    registered: attendees.length,
    spotsLeft: Math.max(o.capacity - attendees.length, 0),
    isRegistered: userId ? attendees.some((a) => String(a) === String(userId)) : false,
    organizer: o.organizer && o.organizer.name ? { id: o.organizer._id, name: o.organizer.name } : o.organizer,
  };
}

// Optional auth so public listings can show the "joined" state.
function softUserId(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(h.slice(7), process.env.JWT_SECRET).id;
  } catch {
    return null;
  }
}

// GET /api/events?category=&q=
router.get('/', async (req, res) => {
  try {
    const { category, q } = req.query;
    const filter = {};
    if (category && category !== 'All') filter.category = String(category);
    if (q && String(q).trim()) {
      const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$or = [{ title: rx }, { category: rx }, { venue: rx }];
    }
    const events = await Event.find(filter).populate('organizer', 'name').sort({ date: 1, time: 1 });
    const uid = softUserId(req);
    res.json({ events: events.map((e) => present(e, uid)) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load events.' });
  }
});

router.get('/mine/registered', requireAuth, async (req, res) => {
  const events = await Event.find({ attendees: req.user._id }).populate('organizer', 'name').sort({ date: 1 });
  res.json({ events: events.map((e) => present(e, req.user._id)) });
});

router.get('/mine/organized', requireAuth, requireOrganizer, async (req, res) => {
  const events = await Event.find({ organizer: req.user._id }).populate('organizer', 'name').sort({ date: 1 });
  res.json({ events: events.map((e) => present(e, req.user._id)) });
});

// Organizer: create
router.post('/', requireAuth, requireOrganizer, async (req, res) => {
  try {
    const { title, description, category, venue, date, time, capacity } = req.body || {};
    const ev = await Event.create({
      title, description, category, venue, date, time,
      capacity: Number(capacity),
      organizer: req.user._id,
    });
    await ev.populate('organizer', 'name');
    res.status(201).json({ event: present(ev, req.user._id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Organizer: remove own event
router.delete('/:id', requireAuth, requireOrganizer, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid event id.' });
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Event not found.' });
  if (String(ev.organizer) !== String(req.user._id)) {
    return res.status(403).json({ error: 'You can only remove your own events.' });
  }
  await ev.deleteOne();
  res.json({ ok: true });
});

// Register (atomic: no duplicates, no overbooking)
router.post('/:id/register', requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid event id.' });
  const updated = await Event.findOneAndUpdate(
    {
      _id: req.params.id,
      attendees: { $ne: req.user._id },
      $expr: { $lt: [{ $size: '$attendees' }, '$capacity'] },
    },
    { $addToSet: { attendees: req.user._id } },
    { new: true }
  ).populate('organizer', 'name');

  if (updated) return res.json({ event: present(updated, req.user._id) });

  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Event not found.' });
  if (ev.attendees.some((a) => String(a) === String(req.user._id))) {
    return res.status(409).json({ error: 'You are already registered.' });
  }
  res.status(409).json({ error: 'Sorry, this event is full.' });
});

// Cancel registration
router.delete('/:id/register', requireAuth, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid event id.' });
  const updated = await Event.findByIdAndUpdate(
    req.params.id,
    { $pull: { attendees: req.user._id } },
    { new: true }
  ).populate('organizer', 'name');
  if (!updated) return res.status(404).json({ error: 'Event not found.' });
  res.json({ event: present(updated, req.user._id) });
});

module.exports = router;
