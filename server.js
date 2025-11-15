const app = require("./src/app");
const config = require("./src/config/config");

const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${config.env} mode on port ${PORT}`);
});
