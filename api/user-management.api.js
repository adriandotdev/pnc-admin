const logger = require("../config/winston");
const { validationResult, body } = require("express-validator");

const TokenMiddleware = require("../middlewares/TokenMiddleware");

const UserManagementService = require("../services/UserManagementService");
const UserManagementRepository = require("../repository/UserManagementRepository");

const { HttpUnprocessableEntity } = require("../utils/HttpError");
/**
 * @param {import('express').Express} app
 */
module.exports = (app) => {
	const tokenMiddleware = new TokenMiddleware();
	const service = new UserManagementService(new UserManagementRepository());

	function validate(req, res) {
		const ERRORS = validationResult(req);

		if (!ERRORS.isEmpty()) {
			throw new HttpUnprocessableEntity(
				"Unprocessable Entity",
				ERRORS.mapped()
			);
		}
	}

	app.post(
		"/admin/api/v1/users/management",
		[
			tokenMiddleware.AccessTokenVerifier(),
			body("username")
				.notEmpty()
				.withMessage("Missing required property: username"),
			body("password")
				.notEmpty()
				.withMessage("Missing required property: password"),
			body("role")
				.notEmpty()
				.withMessage("Missing required property: role")
				.custom((value) =>
					["ADMIN_ACCOUNTING", "ADMIN_MARKETING", "ADMIN_NOC"].includes(value)
				)
				.withMessage(
					"Invalid role value. Valid role values are: [ADMIN_ACCOUNTING, ADMIN_MARKETING, ADMIN_NOC]"
				),
			body("privileges")
				.isObject()
				.withMessage("Property privileges must be type of object"),
			body("privileges.*")
				.custom((value) => value === 0 || value === 1)
				.withMessage("Property privileges must be equal to one or zero"),
		],
		async (req, res, next) => {
			try {
				logger.info({
					ADD_SUB_USER_REQUEST: {
						data: {
							...req.body,
						},
						message: "SUCCESS",
					},
				});

				validate(req, res);

				// OPERATION HERE
				const result = await service.AddSubUser(req.body);

				logger.info({
					ADD_SUB_USER_RESPONSE: {
						message: "SUCCESS",
					},
				});
				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				err.error_name = "ADD_SUB_USER_ERROR";
				next(err);
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
