const mongoose = require('mongoose')

const refreshTokenSchema = mongoose.Schema({
   token: {
      type:String,
      required:true
   },
   user: {
      type: String,
      required: true
   },
   user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
  
   expires_at: {
      type: Date,
      required:true
   }
})

refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema)