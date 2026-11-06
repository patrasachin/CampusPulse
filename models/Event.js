const mongoose = require('mongoose');

const CATEGORIES = ['Technology', 'Cultural', 'Sports', 'Academic', 'Career', 'Social', 'Workshop'];

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: String, required: true, enum: CATEGORIES },
    venue: { type: String, required: true, trim: true, maxlength: 120 },
    date: { type: Date, required: true },
    time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    capacity: { type: Number, required: true, min: 1, max: 100000 },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Event = mongoose.model('Event', eventSchema);
Event.CATEGORIES = CATEGORIES;
module.exports = Event;
