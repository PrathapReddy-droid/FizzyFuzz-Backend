import mongoose from "mongoose";

const configSchema = new mongoose.Schema({
    expiresAt : {
        type : String
    },
    type : {
        type :String
    },
    isEnabled : {
        type : Boolean
    }
},{
    timestamps : true
})


const ConfigModel = mongoose.model('configurations',configSchema)

export default ConfigModel