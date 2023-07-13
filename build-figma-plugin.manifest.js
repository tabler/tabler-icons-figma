module.exports = function (manifest) {
   // ...
   return {
      ...manifest,
      networkAccess: {
         "allowedDomains": [
            "none"
         ],
         "reasoning": "This plugin does not require network access."
      }
   }
}