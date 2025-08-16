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

 

module.exports = mongoose.model("RefreshToken", refreshTokenSchema)