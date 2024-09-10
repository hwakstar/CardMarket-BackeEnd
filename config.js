
// config.js
const config = {
    server: {
      PORT: 5000,
      HOST: 'localhost',
    },
    database: {
      HOST: '127.0.0.1',
      USER: 'root',
      PASSWORD: '',
      NAME: 'Oripa_DB',
    },
    api: {
      VERSION: 'v1',
      KEY: 'api_key',
    },
    admin_authority: {
      admin: "administrators", //authority for managing administrator
      users: "users", //authority for managing users
      category: "category",  //authority for managing category
      prize: "prize",  //authority for managing prize
      gacha: "gacha",  //authority for managing gacha
      point: "point",  //authority for managing point
      deliver: "delivering",  //authority for managing deliver
      notion: "notion",  //authority for managing notion
      userterms: "userterms",  //authority for managing notion
    }
  };
  
  module.exports = config;