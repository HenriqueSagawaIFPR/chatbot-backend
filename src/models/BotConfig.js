import mongoose from 'mongoose';

const botConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  systemInstruction: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

botConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const BotConfig = mongoose.model('BotConfig', botConfigSchema);

export default BotConfig;


