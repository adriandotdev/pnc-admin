const TokenMiddleware = require("../middlewares/TokenMiddleware"); // Remove this if unused
const {
	ROLES,
	RoleManagementMiddleware,
} = require("../middlewares/RoleManagementMiddleware");

const { validationResult, body } = require("express-validator");

const logger = require("../config/winston");

// Import your SERVICE HERE
const ReportsService = require("../services/ReportsService");
// Import MISC HERE

/**
 * @param {import('express').Express} app
 */
module.exports = (app) => {
	const service = new ReportsService();
	const tokenMiddleware = new TokenMiddleware();
	const roleMiddleware = new RoleManagementMiddleware();

	/**
	 * This function will be used by the express-validator for input validation,
	 * and to be attached to APIs middleware.
	 * @param {*} req
	 * @param {*} res
	 */
	function validate(req, res) {
		const ERRORS = validationResult(req);

		if (!ERRORS.isEmpty()) {
			throw new HttpUnprocessableEntity(
				"Unprocessable Entity",
				ERRORS.mapped()
			);
		}
	}

	app.get(
		"/admin/api/v1/dashboard",
		[
			tokenMiddleware.AccessTokenVerifier(),
			roleMiddleware.CheckRole(
				ROLES.ADMIN,
				ROLES.ADMIN_NOC,
				ROLES.ADMIN_MARKETING
			),
		],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res) => {
			try {
				logger.info({
					DASHBOARD_REQUEST: {
						role: req.role,
						message: "SUCCESS",
					},
				});

				const result = await service.GetDashboardData();

				console.log(result);

				logger.info({
					DASHBOARD_RESPONSE: {
						role: req.role,
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				logger.error({
					DASHBOARD_ERROR: {
						err,
						message: err.message,
					},
				});

				return res.status(err.status || 500).json({
					status: err.status || 500,
					data: err.data || [],
					message: err.message || "Internal Server Error",
				});
			}
		}
	);

	app.use((err, req, res, next) => {
		logger.error({
			API_REQUEST_ERROR: {
				error_name: req.error_name || "UNKNOWN_ERROR",
				message: err.message,
				stack: err.stack.replace(/\\/g, "/"), // Include stack trace for debugging
				request: {
					method: req.method,
					url: req.url,
					code: err.status || 500,
				},
				data: err.data || [],
			},
		});

		const status = err.status || 500;
		const message = err.message || "Internal Server Error";

		res.status(status).json({
			status,
			data: err.data || [],
			message,
		});
	});
};
