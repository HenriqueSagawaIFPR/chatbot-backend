import mongoose from 'mongoose';

const userConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  systemInstruction: {
    type: String,
    required: false,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

userConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const UserConfig = mongoose.model('UserConfig', userConfigSchema);

export default UserConfig;


