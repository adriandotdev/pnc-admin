//config app for PM2
module.exports = {
	apps: [
		{
			name: "admin-monolithic:4023", //label
			script: "server.js", //entrypoint
		},
	],
};
