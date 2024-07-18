const TokenMiddleware = require("../middlewares/TokenMiddleware"); // Remove this if unused
const {
	ROLES,
	RoleManagementMiddleware,
} = require("../middlewares/RoleManagementMiddleware");

const { validationResult, body } = require("express-validator");

const logger = require("../config/winston");

const LocationService = require("../services/LocationService");
const LocationRepository = require("../repository/LocationRepository");

const {
	HttpUnprocessableEntity,
	HttpBadRequest,
} = require("../utils/HttpError");

/**
 * @param {import('express').Express} app
 */
module.exports = (app, upload) => {
	const service = new LocationService(new LocationRepository());
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
		"/admin/api/v1/locations",
		[
			tokenMiddleware.AccessTokenVerifier(),
			roleMiddleware.CheckRole(
				ROLES.ADMIN,
				ROLES.ADMIN_MARKETING,
				ROLES.ADMIN_NOC
			),
		],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res) => {
			try {
				logger.info({
					GET_LOCATIONS_REQUEST: {
						data: {
							role: req.role,
						},
						message: "SUCCESS",
					},
				});

				const { limit, offset } = req.query;

				const result = await service.GetLocations({
					limit: parseInt(limit, 10) || 10,
					offset: parseInt(offset, 10) || 0,
				});

				logger.info({
					GET_LOCATIONS_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "GET_LOCATIONS_ERROR";
				next(err);
			}
		}
	);

	app.get(
		"/admin/api/v1/locations/unbinded",
		[
			tokenMiddleware.AccessTokenVerifier(),
			roleMiddleware.CheckRole(
				ROLES.ADMIN,
				ROLES.ADMIN_MARKETING,
				ROLES.ADMIN_NOC
			),
		],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				logger.info({
					GET_UNBINDED_LOCATIONS_REQUEST: {
						data: {
							role: req.role,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.GetUnbindedLocations();

				logger.info({
					GET_UNBINDED_LOCATIONS_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "GET_UNBINDED_LOCATIONS_ERROR";
				next(err);
			}
		}
	);

	app.post(
		"/admin/api/v1/locations",
		[
			tokenMiddleware.AccessTokenVerifier(),
			roleMiddleware.CheckRole(
				ROLES.ADMIN,
				ROLES.ADMIN_MARKETING,
				ROLES.ADMIN_NOC
			),
			body("name")
				.notEmpty()
				.withMessage("Missing required property: name")
				.escape()
				.trim(),
			body("address")
				.notEmpty()
				.withMessage("Missing required property: address")
				.escape()
				.trim(),
			body("facilities")
				.isArray()
				.withMessage("Property: facilities must be in type of array"),
			body("parking_types")
				.isArray()
				.withMessage("Property: parking_types must be in type of array"),
			body("parking_restrictions")
				.isArray()
				.withMessage("Property: parking_restrictions must be in type of array"),
			body("images")
				.isArray()
				.withMessage("Property: images must be in type of array"),
		],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				logger.info({
					REGISTER_LOCATION_REQUEST: {
						data: {
							role: req.role,
							...req.body,
						},
						message: "SUCCESS",
					},
				});

				validate(req, res);

				const {
					cpo_owner_id,
					name,
					address,
					facilities,
					parking_types,
					parking_restrictions,
					images,
				} = req.body;

				const result = await service.RegisterLocation({
					cpo_owner_id,
					name,
					address,
					facilities,
					parking_types,
					parking_restrictions,
					images,
					admin_id: req.id,
				});

				logger.info({
					REGISTER_LOCATION_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "REGISTER_LOCATION_ERROR";
				next(err);
			}
		}
	);

	app.get(
		"/admin/api/v1/locations/:cpo_owner_id",
		[
			tokenMiddleware.AccessTokenVerifier(),
			roleMiddleware.CheckRole(
				ROLES.ADMIN,
				ROLES.ADMIN_MARKETING,
				ROLES.ADMIN_NOC
			),
		],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				logger.info({
					GET_LOCATIONS_BINDED_TO_CPO_REQUEST: {
						data: {
							role: req.role,
							cpo_owner_id: req.params.cpo_owner_id,
						},
						message: "SUCCESS",
					},
				});

				const { cpo_owner_id } = req.params;

				const result = await service.GetBindedLocations(cpo_owner_id);

				logger.info({
					GET_LOCATIONS_BINDED_TO_CPO_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "GET_LOCATIONS_BINDED_TO_CPO_ERROR";
				next(err);
			}
		}
	);

	app.patch(
		"/admin/api/v1/locations/:action/:location_id/:cpo_owner_id",
		[
			tokenMiddleware.AccessTokenVerifier(),
			roleMiddleware.CheckRole(
				ROLES.ADMIN,
				ROLES.ADMIN_MARKETING,
				ROLES.ADMIN_NOC
			),
		],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				logger.info({
					BIND_LOCATION_TO_CPO_REQUEST: {
						data: {
							role: req.role,
							location_id: req.params.location_id,
							cpo_owner_id: req.params.cpo_owner_id,
						},
						message: "SUCCESS",
					},
				});

				const VALID_ACTIONS = ["bind", "unbind"];

				const { action, location_id, cpo_owner_id } = req.params;

				if (!VALID_ACTIONS.includes(action))
					throw new HttpBadRequest(
						"INVALID_ACTIONS: Valid actions are bind, and unbind only"
					);

				let result = undefined;

				if (action === "bind")
					result = await service.BindLocation(
						cpo_owner_id,
						location_id,
						req.id
					);
				else
					result = await service.UnbindLocation(
						cpo_owner_id,
						location_id,
						req.id
					);

				logger.info({
					BIND_LOCATION_TO_CPO_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "BIND_LOCATION_TO_CPO_ERROR";
				next(err);
			}
		}
	);

	app.get(
		"/admin/api/v1/locations/data/defaults",
		[tokenMiddleware.BasicTokenVerifier()],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				logger.info({
					GET_DEFAULT_DATA_REQUEST: {
						message: "SUCCESS",
					},
				});

				const result = await service.GetDefaultData();

				logger.info({
					GET_DEFAULT_DATA_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "GET_DEFAULT_DATA_ERROR";
				next(err);
			}
		}
	);

	app.post(
		"/admin/api/v1/locations/upload",
		[tokenMiddleware.AccessTokenVerifier(), upload.array("images", 5)],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				console.log(req.files);
			} catch (err) {
				req.error_name = "UPLOAD_LOCATION_IMAGES_ERROR";
				next(err);
			}

			return res
				.status(200)
				.json({ status: 200, data: [], message: "Success" });
		}
	);

	app.get(
		"/admin/api/v1/locations/:name/:limit/:offset",
		[
			tokenMiddleware.AccessTokenVerifier(),
			roleMiddleware.CheckRole(ROLES.ADMIN_NOC, ROLES.ADMIN_MARKETING),
		],
		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				const { name, limit, offset } = req.params;
				logger.info({
					SEARCH_LOCATION_BY_NAME_REQUEST: {
						data: { name, limit, offset },
						message: "SUCCESS",
					},
				});

				const result = await service.SearchLocationByName(name, limit, offset);

				logger.info({
					SEARCH_LOCATION_BY_NAME_RESPONSE: {
						SEARCH_LOCATION_BY_NAME_RESPONSE: {
							message: "SUCCESS",
						},
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "SEARCH_LOCATION_BY_NAME_ERROR";
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
