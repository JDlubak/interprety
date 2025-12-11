require('dotenv').config();
const {handleGetQuery} = require('../utils/getQueryHandler')

exports.getAllCategories = async(req,res)=>{
    await handleGetQuery(res, process.env.CATEGORY_QUERY);
}
