const TokenMiddleware = require("../middlewares/TokenMiddleware");
const {
	ROLES,
	RoleManagementMiddleware,
} = require("../middlewares/RoleManagementMiddleware");
const MerchantService = require("../services/MerchantService");
const MerchantRepository = require("../repository/MerchantRepository");
const {
	HttpUnauthorized,
	HttpUnprocessableEntity,
	HttpBadRequest,
} = require("../utils/HttpError");

const logger = require("../config/winston");
const { validationResult, body } = require("express-validator");
/**
 * @param {import ('express').Express} app
 */
module.exports = (app) => {
	const service = new MerchantService(new MerchantRepository());
	const tokenMiddleware = new TokenMiddleware();
	const rolesMiddleware = new RoleManagementMiddleware();
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
		"/admin/api/v1/merchants",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
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
				logger.info({
					GET_CPOS_REQUEST: {
						role: req.role,
						limit: req.query.limit,
						offset: req.query.offset,
					},
				});

				const { limit, offset } = req.query;

				const result = await service.GetCPOs({
					limit: limit || 10,
					offset: offset || 0,
				});

				// There is a bug here
				res.setHeader(
					"X-Pagination",
					`${req.url}?limit=${parseInt(limit) || 10}&offset=${
						parseInt(offset) + 10
					}`
				);

				logger.info({
					GET_CPOS_RESPONSE: {
						message: "Success",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "GET_CPOS_ERROR";
				next(err);
			}
		}
	);

	app.post(
		"/admin/api/v1/merchants",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
				ROLES.ADMIN,
				ROLES.ADMIN_NOC,
				ROLES.ADMIN_MARKETING
			),
			body("party_id")
				.notEmpty()
				.withMessage("Missing required property: party_id")
				.isLength({ min: 3, max: 3 })
				.withMessage("Party ID must be length of three (3)")
				.escape()
				.trim(),
			body("cpo_owner_name")
				.notEmpty()
				.withMessage("Missing required property: cpo_owner_name")
				.escape()
				.trim(),
			body("contact_name")
				.notEmpty()
				.withMessage("Missing required property: contact_person")
				.escape()
				.trim(),
			body("contact_number")
				.notEmpty()
				.withMessage("Missing required property: contact_number")
				.escape()
				.trim(),
			body("contact_email")
				.notEmpty()
				.withMessage("Missing required property: contact_email")
				.isEmail()
				.withMessage("Please provide a valid contact_email")
				.escape()
				.trim(),
			body("username")
				.notEmpty()
				.withMessage("Missing required property: username")
				.escape()
				.trim(),
		],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				logger.info({
					REGISTER_CPO_REQUEST: {
						role: req.role,
						data: { ...req.body },
					},
				});

				validate(req, res);

				const {
					party_id,
					cpo_owner_name,
					contact_name,
					contact_number,
					contact_email,
					username,
				} = req.body;

				const result = await service.RegisterCPO({
					party_id,
					cpo_owner_name,
					contact_name,
					contact_number,
					contact_email,
					username,
					admin_id: req.id, // admin id
				});

				logger.info({
					REGISTER_CPO_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "REGISTER_CPO_ERROR";
				next(err);
			}
		}
	);

	app.get(
		"/admin/api/v1/merchants/check/:type/:value",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
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
				const { type, value } = req.params;

				const VALID_TYPES = ["username", "contact_number", "contact_email"];

				logger.info({
					CHECK_REGISTER_CPO_REQUEST: {
						data: {
							role: req.role,
							type,
							value,
						},
					},
					message: "SUCCESS",
				});

				if (!VALID_TYPES.includes(type))
					throw new HttpBadRequest(
						"INVALID_TYPE: Valid types are username, contact_number, and contact_email"
					);

				const result = await service.CheckRegisterCPO(type, value);

				logger.info({
					CHECK_REGISTER_CPO_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "CHECK_REGISTER_CPO_ERROR";
				next(err);
			}
		}
	);

	app.get(
		"/admin/api/v1/merchants/:cpo_owner_name",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
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
				const { cpo_owner_name } = req.params;

				logger.info({
					SEARCH_CPO_BY_NAME_REQUEST: {
						data: {
							role: req.role,
							cpo_owner_name: req.params.cpo_owner_name,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.SearchCPOByName(cpo_owner_name);

				logger.info({
					SEARCH_CPO_BY_NAME_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "SEARCH_CPO_BY_NAME_ERROR";
				next(err);
			}
		}
	);

	app.patch(
		"/admin/api/v1/merchants/:id",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
				ROLES.ADMIN,
				ROLES.ADMIN_NOC,
				ROLES.ADMIN_MARKETING
			),
			body("cpo_owner_name")
				.optional()
				.notEmpty()
				.withMessage("Missing required property: cpo_owner_name")
				.escape()
				.trim(),
			body("contact_name")
				.optional()
				.notEmpty()
				.withMessage("Missing required property: contact_person")
				.escape()
				.trim(),
			body("contact_number")
				.optional()
				.notEmpty()
				.withMessage("Missing required property: contact_number")
				.escape()
				.trim(),
			body("contact_email")
				.optional()
				.notEmpty()
				.withMessage("Missing required property: contact_email")
				.isEmail()
				.withMessage("Please provide a valid contact_email")
				.escape()
				.trim(),
			body("username")
				.optional()
				.notEmpty()
				.withMessage("Missing required property: username")
				.escape()
				.trim(),
		],

		/**
		 * @param {import('express').Request} req
		 * @param {import('express').Response} res
		 */
		async (req, res, next) => {
			try {
				logger.info({
					UPDATE_CPO_BY_ID_REQUEST: {
						data: {
							role: req.role,
							id: req.params.id,
							...req.body,
						},
						message: "SUCCESS",
					},
				});

				validate(req, res);

				const result = await service.UpdateCPOByID({
					id: req.params.id,
					data: { ...req.body },
					admin_id: req.id,
				});

				logger.info({
					UPDATE_CPO_BY_ID_RESPONSE: {
						message: "SUCCESS",
					},
				});
				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "UPDATE_CPO_BY_ID_ERROR";
				next(err);
			}
		}
	);

	app.post(
		"/admin/api/v1/merchants/rfid/:cpo_owner_id/:rfid_card_tag",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
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
				const { cpo_owner_id, rfid_card_tag } = req.params;

				logger.info({
					ADD_RFID_REQUEST: {
						data: {
							role: req.role,
							cpo_owner_id,
							rfid_card_tag,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.AddRFID(
					cpo_owner_id,
					rfid_card_tag,
					req.id
				);

				logger.info({
					ADD_RFID_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "ADD_RFID_ERROR";
				next(err);
			}
		}
	);

	app.post(
		"/admin/api/v1/merchants/rfids/:cpo_owner_id",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
				ROLES.ADMIN,
				ROLES.ADMIN_NOC,
				ROLES.ADMIN_MARKETING
			),
		],
		async (req, res, next) => {
			try {
				logger.info({
					ADD_RFIDS_REQUEST: {
						data: {
							role: req.role,
							cpo_owner_id: req.params.cpo_owner_id,
							rfids: req.body.rfids,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.AddRFIDs(
					req.params.cpo_owner_id,
					req.body.rfids
				);

				logger.info({
					ADD_RFIDS_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				err.error_name = "ADD_RFIDS_ERROR";
				next(err);
			}
		}
	);

	app.post(
		"/admin/api/v1/merchants/topup/:cpo_owner_id",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
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
				const { cpo_owner_id } = req.params;
				const { amount } = req.body;

				logger.info({
					TOPUP_TO_CPO_REQUEST: {
						data: {
							role: req.role,
							cpo_owner_id,
							amount,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.Topup(cpo_owner_id, amount, req.id);

				logger.info({
					TOPUP_TO_CPO_RESPONSE: {
						message: "SUCCESS",
					},
				});
				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "TOPUP_TO_CPO_ERROR";
				next(err);
			}
		}
	);

	app.get(
		"/admin/api/v1/merchants/topups/:cpo_owner_id",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
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
				const { cpo_owner_id } = req.params;

				logger.info({
					GET_TOPUP_LOGS: {
						data: {
							role: req.role,
							cpo_owner_id,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.GetTopupByID(cpo_owner_id);

				logger.info({
					GET_TOPUP_LOGS_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "GET_TOPUP_LOGS_ERROR";
				next(err);
			}
		}
	);

	app.post(
		"/admin/api/v1/merchants/topups/void/:reference_id",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
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
				const { reference_id } = req.params;

				logger.info({
					VOID_TOPUP_REQUEST: {
						data: {
							reference_id,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.VoidTopup(reference_id, req.id);

				logger.info({
					VOID_TOPUP_RESPONSE: {
						message: "SUCCESS",
					},
				});
				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "VOID_TOPUP_ERROR";
				next(err);
			}
		}
	);

	app.patch(
		"/admin/api/v1/merchants/:action/:user_id",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
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
				const { action, user_id } = req.params;
				logger.info({
					ACTIVATE_OR_DEACTIVATE_CPO_ACCOUNT_ERROR: {
						data: {
							action,
							user_id,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.ChangeCPOAccountStatus(
					action,
					user_id,
					req.id
				);

				logger.info({
					ACTIVATE_OR_DEACTIVATE_CPO_ACCOUNT_ERROR: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "ACTIVATE_OR_DEACTIVATE_CPO_ACCOUNT_ERROR";
				next(err);
			}
		}
	);

	/** Company Partner Details */
	app.get(
		"/admin/api/v1/company_partner_details",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
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
				logger.info({
					GET_COMPANY_PARTNER_DETAILS_REQUEST: {
						message: "SUCCESS",
					},
				});

				const result = await service.GetCompanyPartnerDetails();

				logger.info({
					GET_COMPANY_PARTNER_DETAILS_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "GET_COMPANY_PARTNER_DETAILS_ERROR";
				next(err);
			}
		}
	);

	app.post(
		"/admin/api/v1/company_partner_details",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
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
				const { company_name, address } = req.body;

				logger.info({
					REGISTER_COMPANY_PARTNER_REQUEST: {
						data: { company_name },
						message: "SUCCESS",
					},
				});

				const result = await service.RegisterCompanyPartnerDetails(
					company_name,
					address,
					req.id
				);

				logger.info({
					REGISTER_COMPANY_PARTNER_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "REGISTER_COMPANY_PARTNER_ERROR";
				next(err);
			}
		}
	);

	app.patch(
		"/admin/api/v1/company_partner_details/:id",
		[
			tokenMiddleware.AccessTokenVerifier(),
			rolesMiddleware.CheckRole(
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
				const { id } = req.params;
				const { company_name, address } = req.body;

				logger.info({
					UPDATE_COMPANY_PARTNER_REQUEST: {
						data: {
							company_name,
							address,
						},
						message: "SUCCESS",
					},
				});

				const result = await service.UpdateCompanyPartnerDetails({
					address,
					id,
					admin_id: req.id,
				});

				logger.info({
					UPDATE_COMPANY_PARTNER_RESPONSE: {
						message: "SUCCESS",
					},
				});

				return res
					.status(200)
					.json({ status: 200, data: result, message: "Success" });
			} catch (err) {
				req.error_name = "UPDATE_COMPANY_PARTNER_ERROR";
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
