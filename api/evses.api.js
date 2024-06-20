// Service
const EVSEService = require("../services/EVSEService");

// Middleware
const TokenMiddleware = require("../middlewares/TokenMiddleware");
const {
	ROLES,
	RoleManagementMiddleware,
} = require("../middlewares/RoleManagementMiddleware");

// Utils
const {
	HttpUnprocessableEntity,
	HttpBadRequest,
} = require("../utils/HttpError");
const logger = require("../config/winston");
const { validationResult, body } = require("express-validator");

/**
 * @param {import('express').Express} app
 */
module.exports = (app) => {
	/**
	 * import your service here
	 * import your middlewares here
	 */
	const service = new EVSEService();
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

	// API for retrieving list of EVSEs
	app.get(
		"/admin/api/v1/evses",
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
		async (req, res, next) => {
			try {
				const { limit, offset } = req.query;

				logger.info({
					GET_EVSES_REQUEST: { data: { limit, offset }, message: "SUCCESS" },
				});

				const result = await service.GetEVSES({
					limit: parseInt(limit, 10) || 10,
					offset: parseInt(offset, 10) || 0,
				});

				logger.info({
					GET_EVSES_RESPONSE: {
						message: "SUCCESS",
					},
				});
				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "GET_EVSES_ERROR";
				next(err);
			}
		}
	);

	// API for registering new EVSE
	app.post(
		"/admin/api/v1/evses",
		[
			tokenMiddleware.AccessTokenVerifier(),
			roleMiddleware.CheckRole(
				ROLES.ADMIN,
				ROLES.ADMIN_NOC,
				ROLES.ADMIN_MARKETING
			),
			body("model").notEmpty().withMessage("Missing required property: model"),
			body("vendor")
				.notEmpty()
				.withMessage("Missing required property: vendor"),
			body("serial_number")
				.notEmpty()
				.withMessage("Missign required property: serial_number"),
			body("box_serial_number")
				.notEmpty()
				.withMessage("Missing required property: box_serial_number"),
			body("firmware_version")
				.notEmpty()
				.withMessage("Missing required property: firmware_version"),
			body("iccid").notEmpty().withMessage("Missing required property: iccid"),
			body("imsi").notEmpty().withMessage("Missing required property: imsi"),
			body("meter_type")
				.notEmpty()
				.withMessage("Missing required property: meter_type"),
			body("meter_serial_number")
				.notEmpty()
				.withMessage("Missing required property: meter_serial_number"),
			body("kwh").notEmpty().withMessage("Missing required property: kwh"),
			body("connectors")
				.isArray()
				.withMessage("Invalid data type: connectors must be in array type")
				.custom((value) => value.length > 0)
				.withMessage("Please provide at least one connector"),
			body("connectors.*.standard")
				.notEmpty()
				.withMessage(
					"Missing required property: standard. (E.g TYPE_2, CHADEMO)"
				),
			body("connectors.*.format")
				.notEmpty()
				.withMessage("Missing required property: format. (E.g SOCKET)"),
			body("connectors.*.power_type")
				.notEmpty()
				.withMessage("Missing required property: power_type. (E.g AC, DC)"),
			body("connectors.*.max_voltage")
				.notEmpty()
				.withMessage("Missing required property: max_voltage")
				.isNumeric()
				.withMessage("Invalid data type: max_voltage must be a number."),
			body("connectors.*.max_amperage")
				.notEmpty()
				.withMessage("Missing required property: max_amperage")
				.isNumeric()
				.withMessage("Invalid data type: max_amperage must be a number."),
			body("connectors.*.max_electric_power")
				.notEmpty()
				.withMessage("Missing required property: max_electric_power")
				.isNumeric()
				.withMessage("Invalid data type: max_electric_power must be a number."),
			body("connectors.*.rate_setting")
				.notEmpty()
				.withMessage("Missing required property: rate_setting")
				.isNumeric()
				.withMessage("Invalid data type: rate_setting must be a number."),
			body("payment_types")
				.isArray()
				.withMessage("Property: payment_types must be in type of Array"),
			body("capabilities")
				.isArray()
				.withMessage("Property: capabilities must be in type of Array"),
			body("location_id").optional(),
		],
		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				validate(req, res);

				logger.info({
					REGISTER_EVSE_REQUEST: {
						data: {
							...req.body,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.RegisterEVSE({
					...req.body,
					admin_id: req.id,
				});

				logger.info({
					REGISTER_EVSE_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "REGISTER_EVSE_ERROR";
				next(err);
			}
		}
	);

	// API for binding or undbinding EVSE based on its evse_uid.
	app.patch(
		"/admin/api/v1/evses/:action/:location_id/:evse_uid",
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
		async (req, res, next) => {
			try {
				const { action, location_id, evse_uid } = req.params;
				const VALID_ACTIONS = ["bind", "unbind"];

				logger.info({
					BIND_OR_UNBIND_EVSE_REQUEST: {
						data: {
							action,
							location_id,
							evse_uid,
						},
						message: "SUCCESS",
					},
				});

				if (!VALID_ACTIONS.includes(action))
					throw new HttpBadRequest(
						"Invalid action. Valid actions are: bind or unbind"
					);

				let result = undefined;

				if (action === "bind") {
					// When action is bind.
					result = await service.BindEVSE({
						location_id,
						evse_uid,
						admin_id: req.id,
					});
				} else {
					// When action is unbind.
					result = await service.UnbindEVSE({
						location_id,
						evse_uid,
						admin_id: req.id,
					});
				}

				logger.info({
					BIND_OR_UNBIND_EVSE_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "BIND_OR_UNBIND_EVSE_ERROR";
				next(err);
			}
		}
	);

	// API for retrieving list of default data for registering EVSEs
	app.get(
		"/admin/api/v1/evses/data/defaults",
		[tokenMiddleware.BasicTokenVerifier()],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				logger.info({
					GET_DEFAULT_DATA_REQUEST: {
						message: "Success",
					},
				});

				const result = await service.GetDefaultData();

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "GET_DEFAULT_DATA_ERROR";
				next(err);
			}
		}
	);

	// API for searching EVSE based on serial number.
	app.get(
		"/admin/api/v1/evses/search/:serial_number/:limit/:offset",
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
		async (req, res, next) => {
			try {
				const { serial_number, limit, offset } = req.params;

				logger.info({
					SEARCH_EVSE_BY_SERIAL_NUMBER_REQUEST: {
						data: {
							serial_number,
							limit,
							offset,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.SearchEVSEBySerialNumber(
					serial_number,
					limit,
					offset
				);

				logger.info({
					SEARCH_EVSE_BY_SERIAL_NUMBER_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "SEARCH_EVSE_BY_SERIAL_NUMBER_ERROR";
				next(err);
			}
		}
	);

	// Error handler
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
