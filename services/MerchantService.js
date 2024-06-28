const MerchantRepository = require("../repository/MerchantRepository");

const generator = require("generate-password");
const { HttpBadRequest } = require("../utils/HttpError");
const Email = require("../utils/Email");

const axios = require("axios");

module.exports = class MerchantService {
	/**
	 * @type {MerchantRepository}
	 */
	#repository;

	constructor(repository) {
		this.#repository = repository;
	}

	/**
	 * Retrieves a list of Charge Point Operators (CPOs) based on provided criteria.
	 *
	 * @async
	 * @function GetCPOs
	 * @param {Object} data - An object containing criteria for filtering CPOs.
	 * @param {number} [data.limit=10] - The maximum number of CPOs to retrieve. Defaults to 10 if not provided.
	 * @param {number} [data.offset=0] - The number of CPOs to skip before retrieving. Defaults to 0 if not provided.
	 * @param {string} [data.sortBy="name"] - The field to sort the CPOs by. Defaults to "name" if not provided.
	 * @param {string} [data.order="asc"] - The order in which the CPOs should be sorted. Can be "asc" for ascending or "desc" for descending. Defaults to "asc" if not provided.
	 * @param {string} [data.searchQuery=""] - A search query to filter CPOs by name or other relevant fields. Defaults to an empty string if not provided.
	 * @returns {Promise<Array<Object>>} A promise that resolves to an array of CPO objects matching the provided criteria.
	 * @throws {Error} Throws an error if the retrieval of CPOs fails.
	 */
	async GetCPOs(data) {
		const totalCPOsInDB = await this.#repository.CountCPOs(data);
		const result = await this.#repository.GetCPOs(data);

		return {
			cpos: result,
			total_cpos_returned: result.length,
			total_cpos: totalCPOsInDB[0].total_cpos,
			limit: data.limit,
			offset: data.offset,
		};
	}

	/**
	 * Registers a new Charging Point Operator (CPO) with the provided data.
	 *
	 * @async
	 * @function RegisterCPO
	 * @param {Object} data - An object containing the information needed to register the CPO.
	 * @param {string} data.username - The username for the new CPO account.
	 * @param {string} data.contact_email - The email address to which the username and temporary password will be sent.
	 * @param {string} data.admin_id - The ID of the administrator performing the registration.
	 * @returns {Promise<string>} A promise that resolves to a status indicating the outcome of the registration process.
	 * @throws {HttpBadRequest} Throws an error if the registration process fails.
	 */
	async RegisterCPO(data) {
		try {
			const password = generator.generate({ length: 10, numbers: false });
			const username = data.username;

			const email = new Email(data.contact_email, { username, password });

			await email.SendUsernameAndPassword();

			const result = await this.#repository.RegisterCPO({ ...data, password });

			const status = result[0][0].STATUS;

			if (status !== "SUCCESS") {
				throw new HttpBadRequest("Bad Request", status);
			}

			// Add audit trail
			await this.#repository.AuditTrail({
				admin_id: data.admin_id,
				cpo_id: null,
				action: "REGISTER Charging Point Operator",
				remarks: "success",
			});

			return status;
		} catch (err) {
			// Add audit trail
			await this.#repository.AuditTrail({
				admin_id: data.admin_id,
				cpo_id: null,
				action: "ATTEMPT to REGISTER Charging Point Operator",
				remarks: "failed",
			});

			throw err;
		}
	}

	/**
	 * Checks the validity of the provided data for registering a Charging Point Operator (CPO).
	 *
	 * @async
	 * @function CheckRegisterCPO
	 * @param {string} type - The type of data to be checked (e.g., "username", "contact_number", "contact_email").
	 * @param {string} value - The value of the data to be checked.
	 * @returns {Promise<string>} A promise that resolves to a status indicating the outcome of the validation process.
	 * @throws {HttpBadRequest} Throws an error if the validation process fails.
	 */
	async CheckRegisterCPO(type, value) {
		if (type === "username" && !String(value).match(/^[a-zA-Z0-9_]+$/))
			throw new HttpBadRequest(
				"INVALID_USERNAME",
				"Username must only contains letters, numbers, and underscores"
			);

		if (
			type === "contact_number" &&
			!String(value).match(/^(?:\+639|09)\d{9}$/)
		)
			throw new HttpBadRequest(
				"INVALID_CONTACT_NUMBER",
				"Contact number must be a valid number. (E.g. +639112231123 or 09112231123)"
			);

		if (
			type === "contact_email" &&
			!String(value).match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/)
		)
			throw new HttpBadRequest(
				"INVALID_CONTACT_EMAIL",
				"Contact email must be a valid email. (E.g. email@gmail.com)"
			);

		const result = await this.#repository.CheckRegisterCPO(type, value);

		const STATUS = result[0][0].STATUS;

		if (STATUS !== "SUCCESS") throw new HttpBadRequest(STATUS, []);

		return STATUS;
	}

	/**
	 * Searches for Charging Point Operators (CPOs) by their name.
	 * If the provided name is ":cpo_owner_name", it returns a list of CPOs with pagination applied.
	 * Otherwise, it searches for CPOs with names matching the provided string in a case-insensitive manner.
	 *
	 * @async
	 * @function SearchCPOByName
	 * @param {string} cpoOwnerName - The name of the Charging Point Operator (CPO) to search for.
	 * @returns {Promise<Object[]>} A promise that resolves to an array of CPO objects that match the search criteria.
	 */
	async SearchCPOByName(cpoOwnerName) {
		// Check if it is empty, then return all of the lists
		if (cpoOwnerName === ":cpo_owner_name") {
			const result = await this.#repository.GetCPOs({ limit: 10, offset: 0 });

			return result;
		}

		const result = await this.#repository.SearchCPOByName(
			cpoOwnerName.toLowerCase()
		);

		return result;
	}

	/**
	 * Updates a Charging Point Operator (CPO) by its ID with the provided data.
	 *
	 * @async
	 * @function UpdateCPOByID
	 * @param {Object} options - The options object.
	 * @param {number} options.id - The ID of the Charging Point Operator (CPO) to update.
	 * @param {Object} options.data - The data to update the CPO with.
	 * @param {string} options.admin_id - The ID of the admin performing the update.
	 * @returns {Promise<string>} A promise that resolves to a string indicating the result of the update operation.
	 * @throws {HttpBadRequest} Throws an error if the provided data contains invalid inputs or if the update operation fails.
	 */
	async UpdateCPOByID({ id, data, admin_id }) {
		try {
			const VALID_INPUTS = [
				"cpo_owner_name",
				"contact_name",
				"contact_number",
				"contact_email",
				"username",
			];

			if (!Object.keys(data).every((value) => VALID_INPUTS.includes(value)))
				throw new HttpBadRequest(
					`Valid inputs are: ${VALID_INPUTS.join(", ")}`
				);

			if (Object.keys(data).length === 0) {
				await this.#repository.AuditTrail({
					admin_id,
					cpo_id: null,
					action:
						"ATTEMPT to UPDATE Charging Point Operator - No Changes Applied",
					remarks: "success",
				});
				return "NO_CHANGES_APPLIED";
			}

			let newData = {};
			let errors = {};

			// Encrypt all of the updated data except the username.
			Object.keys(data).forEach((key) => {
				newData[key] = data[key];
			});

			if (
				(
					await this.#repository.CheckIfColumnValueExists({
						table: "users",
						column: "username",
						value: newData["username"],
					})
				).length > 0
			)
				errors.username = "USERNAME_EXISTS";

			if (
				(
					await this.#repository.CheckIfColumnValueExists({
						table: "cpo_owners",
						column: "cpo_owner_name",
						value: newData["cpo_owner_name"],
					})
				).length > 0
			)
				errors.cpo_owner_name = "CPO_OWNER_NAME_EXISTS";

			if (
				(
					await this.#repository.CheckIfColumnValueExists({
						table: "cpo_owners",
						column: "contact_name",
						value: newData["contact_name"],
					})
				).length > 0
			)
				errors.contact_name = "CONTACT_NAME_EXISTS";

			if (
				(
					await this.#repository.CheckIfColumnValueExists({
						table: "cpo_owners",
						column: "contact_number",
						value: newData["contact_number"],
					})
				).length > 0
			)
				errors.cotnact_number = "CONTACT_NUMBER_EXISTS";

			if (
				(
					await this.#repository.CheckIfColumnValueExists({
						table: "cpo_owners",
						column: "contact_email",
						value: newData["contact_email"],
					})
				).length > 0
			)
				errors.contact_email = "CONTACT_EMAIL_EXISTS";

			if (Object.keys(errors).length)
				throw new HttpBadRequest("INVALID_REQUEST", { errors });

			// Setting up the query
			let query = "SET";

			const dataEntries = Object.entries(newData);

			for (const [key, value] of dataEntries) {
				query += ` ${key} = '${value}',`;
			}

			const updateResult = await this.#repository.UpdateCPOByID({
				id,
				query: query.slice(0, query.length - 1),
			});

			if (updateResult.affectedRows > 0) {
				// Add audit trail
				await this.#repository.AuditTrail({
					admin_id: admin_id,
					cpo_id: null,
					action: `UPDATE Charging Point Operator with id of ${id}`,
					remarks: "success",
				});

				return "SUCCESS";
			}

			throw new HttpBadRequest("CPO_ID_DOES_NOT_EXISTS", []);
		} catch (err) {
			// Add audit trail
			await this.#repository.AuditTrail({
				admin_id: admin_id,
				cpo_id: null,
				action: "ATTEMPT to UPDATE Charging Point Operator",
				remarks: "failed",
			});

			throw err;
		}
	}

	/**
	 * Adds an RFID card tag to a Charging Point Operator (CPO) identified by its ID.
	 *
	 * @async
	 * @function AddRFID
	 * @param {number} cpoOwnerID - The ID of the Charging Point Operator (CPO) to add the RFID card tag to.
	 * @param {string} rfidCardTag - The RFID card tag to add.
	 * @param {string} admin_id - The ID of the admin performing the operation.
	 * @returns {Promise<string>} A promise that resolves to a string indicating the result of the operation.
	 * @throws {HttpBadRequest} Throws an error if the operation fails.
	 */
	async AddRFID(cpoOwnerID, rfidCardTag, admin_id) {
		try {
			const result = await this.#repository.AddRFID(cpoOwnerID, rfidCardTag);

			const status = result[0][0].STATUS;

			if (status !== "SUCCESS") throw new HttpBadRequest(status, []);

			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: `ADD RFID to Charging Point Operator with id of ${cpoOwnerID}`,
				remarks: "success",
			});

			return status;
		} catch (err) {
			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: "ATTEMPT to ADD RFID to Charging Point Operator",
				remarks: "failed",
			});
			throw err;
		}
	}

	/**
	 * Adds new RFID card tags for a given CPO owner.
	 *
	 * @async
	 * @param {string} cpoOwnerID - The ID of the CPO (Charge Point Operator) owner.
	 * @param {Array<string>} rfidCardTags - An array of RFID card tags to be added.
	 * @throws {HttpBadRequest} If any of the RFID card tags already exist.
	 * @returns {Promise<string>} Returns "SUCCESS" if the operation is successful.
	 */
	async AddRFIDs(cpoOwnerID, rfidCardTags) {
		/**
		 * @type {Array<string>}
		 */
		let existingRFIDs = await this.#repository.GetRFIDs();

		existingRFIDs = existingRFIDs.map((rfid) => rfid.rfid_card_tag);

		rfidCardTags.forEach((rfid) => {
			if (existingRFIDs.includes(rfid))
				throw new HttpBadRequest(`RFID_EXISTS: ${rfid}`, []);
		});

		const rfidCardsToAdd = rfidCardTags.map((rfid) => [
			rfid,
			cpoOwnerID,
			null,
			0,
			0,
			"PHYSICAL",
			"UNASSIGNED",
			new Date(),
			new Date(),
		]);

		await this.#repository.AddRFIDs(rfidCardsToAdd);

		return "SUCCESS";
	}

	/**
	 * Performs a top-up operation for a Charging Point Operator (CPO) identified by its ID.
	 *
	 * @async
	 * @function Topup
	 * @param {number} cpoOwnerID - The ID of the Charging Point Operator (CPO) to top up.
	 * @param {number} amount - The amount to top up.
	 * @param {string} admin_id - The ID of the admin performing the top-up operation.
	 * @returns {Promise<Object>} A promise that resolves to an object containing the status of the operation and the new balance after top-up.
	 * @throws {HttpBadRequest} Throws an error if the operation fails.
	 */
	async Topup(cpoOwnerID, amount, admin_id) {
		try {
			if (amount <= 0) throw new HttpBadRequest("INVALID_AMOUNT", []);

			const result = await this.#repository.Topup(cpoOwnerID, amount);

			const status = result[0][0].STATUS;
			const new_balance = result[0][0].current_balance;

			if (status !== "SUCCESS") {
				throw new HttpBadRequest(status, []);
			}

			// Audit trail
			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: `TOPUP to CPO with id of ${cpoOwnerID}`,
				remarks: "success",
			});

			return { status, new_balance };
		} catch (err) {
			// Audit trail
			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: `ATTEMPT to TOPUP to CPO with id of ${cpoOwnerID}`,
				remarks: "failed",
			});
			throw err;
		}
	}

	/**
	 * Retrieves the top-up information for a Charging Point Operator (CPO) identified by its ID.
	 *
	 * @async
	 * @function GetTopupByID
	 * @param {number} cpoOwnerID - The ID of the Charging Point Operator (CPO) to retrieve top-up information for.
	 * @returns {Promise<Object>} A promise that resolves to the top-up information for the specified CPO.
	 */
	async GetTopupByID(cpoOwnerID) {
		const result = await this.#repository.GetTopupByID(cpoOwnerID);

		return result;
	}

	/**
	 * Voids a top-up transaction identified by its reference ID.
	 *
	 * @async
	 * @function VoidTopup
	 * @param {string} referenceID - The reference ID of the top-up transaction to void.
	 * @param {number} admin_id - The ID of the administrator performing the void operation.
	 * @returns {Promise<Object>} A promise that resolves to an object containing the status of the void operation, the current balance after voiding, and the reference number of the voided transaction.
	 */
	async VoidTopup(referenceID, admin_id) {
		try {
			const result = await this.#repository.VoidTopup(referenceID);

			const status = result[0][0].STATUS;
			const current_balance = result[0][0].current_balance;
			const reference_number = result[0][0].reference_number;

			if (status !== "SUCCESS") throw new HttpBadRequest(status, []);

			// Audit trail
			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: `VOID Topup with reference ID of ${referenceID}`,
				remarks: "success",
			});

			return { status, current_balance, reference_number };
		} catch (err) {
			// Audit trail
			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: "ATTEMPT to VOID Topup",
				remarks: "failed",
			});
			throw err;
		}
	}

	/**
	 * Activates or deactivates a Charging Point Operator (CPO) account based on the specified action.
	 *
	 * @async
	 * @function ChangeCPOAccountStatus
	 * @param {string} action - The action to perform, either 'activate' or 'deactivate'.
	 * @param {number} userID - The ID of the CPO account to activate or deactivate.
	 * @param {number} admin_id - The ID of the administrator performing the action.
	 * @returns {Promise<string>} A promise that resolves to a string indicating the success or failure of the action.
	 *                              Possible return values: 'SUCCESS' if the action was successful,
	 *                              'NO_CHANGES_APPLIED' if no changes were applied, or an error message if the action failed.
	 */
	async ChangeCPOAccountStatus(action, userID, admin_id) {
		try {
			if (!["activate", "deactivate"].includes(action))
				throw new HttpBadRequest("INVALID_ACTION", {
					message: "Valid actions are: activate, and deactivate",
				});

			let result = null;

			if (action === "activate")
				result = await this.#repository.ActivateCPOAccount(userID);
			else result = await this.#repository.DeactivateCPOAccount(userID);

			if (result.affectedRows) {
				await this.#repository.AuditTrail({
					admin_id,
					cpo_id: null,
					action: `${
						action === "activate" ? "ACTIVATE" : "DEACTIVATE"
					} Charging Point Operator account with id of ${userID}`,
					remarks: "success",
				});
				return "SUCCESS";
			}

			return "NO_CHANGES_APPLIED";
		} catch (err) {
			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: `ATTEMPT to DEACTIVATE Charging Point Operator account`,
				remarks: "failed",
			});

			throw err;
		}
	}

	/**
	 * Retrieves details of company partners.
	 *
	 * @async
	 * @function GetCompanyPartnerDetails
	 * @returns {Promise<any>} A promise that resolves to the details of company partners.
	 */
	async GetCompanyPartnerDetails() {
		const result = await this.#repository.GetCompanyPartnerDetails();

		return result;
	}

	/**
	 * Registers company partner details.
	 *
	 * @async
	 * @function RegisterCompanyPartnerDetails
	 * @param {string} companyName - The name of the company.
	 * @param {string} address - The address of the company.
	 * @param {string} id - The ID of the admin performing the registration.
	 * @returns {Promise<Object>} A promise that resolves to an object containing the registered party ID and a success message.
	 * @throws {HttpBadRequest} Throws an error if the location is not found or if the registration attempt fails.
	 */
	async RegisterCompanyPartnerDetails(companyName, address, id) {
		try {
			const geocodedAddress = await axios.get(
				`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURI(
					address
				)}&key=${process.env.GOOGLE_GEO_API_KEY}`
			);

			const address_components =
				geocodedAddress.data.results[0]?.address_components;

			if (!address_components)
				throw new HttpBadRequest("LOCATION_NOT_FOUND", []);

			const country_code = address_components.find((component) =>
				component.types.includes("country")
			)?.short_name;

			const party_id = await this.GeneratePartyID(companyName);

			const result = await this.#repository.RegisterCompanyPartnerDetails({
				company_name: companyName,
				party_id,
				country_code,
			});

			if (result.insertId) {
				await this.#repository.AuditTrail({
					admin_id: id,
					cpo_id: null,
					action: "CREATED Company Partner Details",
					remarks: "success",
				});
				return {
					party_id,
					message: "SUCCESS",
				};
			}

			await this.#repository.AuditTrail({
				admin_id: id,
				cpo_id: null,
				action: "ATTEMPT to create partner details",
				remarks: "failed",
			});

			return result;
		} catch (err) {
			await this.#repository.AuditTrail({
				admin_id: id,
				cpo_id: null,
				action: "ATTEMPT to create partner details",
				remarks: "failed",
			});
			throw err;
		}
	}

	/**
	 * Updates company partner details.
	 *
	 * @async
	 * @function UpdateCompanyPartnerDetails
	 * @param {Object} data - The data object containing the address, ID, and admin ID.
	 * @param {string} data.address - The updated address of the company partner.
	 * @param {string} data.id - The ID of the company partner.
	 * @param {string} data.admin_id - The ID of the admin performing the update.
	 * @returns {Promise<string|Object>} A promise that resolves to "SUCCESS" if the update is successful, or the result object if unsuccessful.
	 * @throws {HttpBadRequest} Throws an error if the location is not found or if the update attempt fails.
	 */
	async UpdateCompanyPartnerDetails({ address, id, admin_id }) {
		try {
			const geocodedAddress = await axios.get(
				`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURI(
					address
				)}&key=${process.env.GOOGLE_GEO_API_KEY}`
			);

			const address_components =
				geocodedAddress.data.results[0]?.address_components;

			if (!address_components)
				throw new HttpBadRequest("LOCATION_NOT_FOUND", []);

			const country_code = address_components.find((component) =>
				component.types.includes("country")
			)?.short_name;

			const result = await this.#repository.UpdateCompanyPartnerDetails({
				country_code,
				id,
			});

			if (result.affectedRows) {
				await this.#repository.AuditTrail({
					admin_id,
					cpo_id: null,
					action: "UPDATE Company Partner Details",
					remarks: "success",
				});
				return "SUCCESS";
			}

			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: "ATTEMPT to update company partner details",
				remarks: "failed",
			});

			return result;
		} catch (err) {
			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: "ATTEMPT to update company partner details",
				remarks: "failed",
			});

			throw err;
		}
	}

	/**
	 * Generates a party ID based on the provided company name.
	 *
	 * @async
	 * @private
	 * @method #GeneratePartyID
	 * @param {string} companyName - The name of the company.
	 * @returns {Promise<string>} A promise that resolves to the generated party ID.
	 */
	async #GeneratePartyID(companyName) {
		/**
		 * @Steps
		 *
		 * 1. Get all of the generated party ids first from the db.
		 *
		 * 2. Remove the spaces from company name.
		 *
		 * 3. Generate EVSE ID */

		const partyIDs = await this.#repository.GetCompanyPartnerDetails();

		const companyNameWithoutSpaces = String(companyName)
			.replace(/\s+/g, "")
			.trim()
			.toUpperCase(); // Trim and remove spaces.

		let partyID = companyNameWithoutSpaces.slice(0, 2);

		/** For the mean time, generation of this party_id is for the third (3rd) letter. */
		for (let i = 2; i < companyNameWithoutSpaces.length; i++) {
			// Check if party id already exists
			const isFound = partyIDs.some(
				(data) => data.party_id === partyID + companyNameWithoutSpaces[i]
			);

			if (!isFound) {
				partyID += companyNameWithoutSpaces[i];
				break;
			}
		}

		return partyID.toUpperCase(); // Return the party id. it must be uppercase.
	}

	async GeneratePartyID(companyName) {
		return await this.#GeneratePartyID(companyName);
	}
};
