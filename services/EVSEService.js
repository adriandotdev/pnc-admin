// Repositories
const ConnectorRepository = require("../repository/ConnectorRepository");
const EVSERepository = require("../repository/EVSERepository");

// Utils
const { HttpBadRequest } = require("../utils/HttpError");
const { v4: uuidv4 } = require("uuid");

module.exports = class EVSEService {
	#evseRepository;
	#connectorRepository;

	constructor() {
		this.#evseRepository = new EVSERepository();
		this.#connectorRepository = new ConnectorRepository();
	}

	/**
	 * Retrieves EVSE (Electric Vehicle Supply Equipment) records with pagination.
	 *
	 * @async
	 * @function GetEVSES
	 * @param {Object} options - Options object containing limit and offset.
	 * @param {number} options.limit - The maximum number of records to retrieve.
	 * @param {number} options.offset - The number of records to skip before starting to retrieve.
	 * @throws {HttpBadRequest} Throws an error if the limit or offset is not a number.
	 * @returns {Promise<Object>} The result of the EVSE retrieval operation.
	 */
	async GetEVSES({ limit, offset }) {
		if (typeof limit !== "number")
			throw new HttpBadRequest(
				"Invalid limit. Limit must be on type of number"
			);

		if (typeof offset !== "number")
			throw new HttpBadRequest(
				"Invalid offset. Offset must be in type of number"
			);

		const totalEVSEsInDB = await this.#evseRepository.CountEVSES();
		const result = await this.#evseRepository.GetEVSES({ limit, offset });

		return {
			evses: result,
			total_evses_returned: result.length,
			total_evses: totalEVSEsInDB[0].total_evses,
			limit,
			offset,
		};
	}

	/**
	 * Registers a new Electric Vehicle Supply Equipment (EVSE) with the given data.
	 *
	 * @async
	 * @function RegisterEVSE
	 * @param {Object} data - The data required to register the EVSE.
	 * @param {string} data.admin_id - The ID of the admin registering the EVSE.
	 * @param {Array} data.connectors - An array of connectors associated with the EVSE.
	 * @param {number} data.kwh - The kilowatt-hour capacity of the EVSE.
	 * @param {Array<string>} data.payment_types - An array of payment types supported by the EVSE.
	 * @param {Array<string>} data.capabilities - An array of capabilities of the EVSE.
	 * @throws {HttpBadRequest} Throws an error if the registration status is not "SUCCESS".
	 * @returns {Promise<string>} The status of the registration operation.
	 */
	async RegisterEVSE(data) {
		let conn = null;

		try {
			const uid = uuidv4();

			const { result, connection } = await this.#evseRepository.RegisterEVSE({
				uid,
				...data,
			});
			const status = result[0][0].STATUS;
			conn = connection;

			if (status !== "SUCCESS") throw new HttpBadRequest(status, []);

			const connectorResult = await this.#connectorRepository.AddConnector(
				uid,
				data.connectors,
				connection
			);

			await this.#connectorRepository.AddTimeslots(
				uid,
				1,
				data.kwh,
				data.connectors.length,
				connection
			);

			const newPaymentTypes = data.payment_types.map((payment_type) => [
				uid,
				payment_type,
			]);

			await this.#evseRepository.AddEVSEPaymentTypes(
				newPaymentTypes,
				connection
			);

			const newCapabilities = data.capabilities.map((capability) => [
				capability,
				uid,
			]);

			await this.#evseRepository.AddEVSECapabilities(
				newCapabilities,
				connection
			);

			// Audit trail
			await this.#evseRepository.AuditTrail({
				admin_id: data.admin_id,
				cpo_id: null,
				action: "REGISTER new EVSE",
				remarks: "success",
			});
			conn.commit();
			return status;
		} catch (err) {
			if (conn) conn.rollback();

			// Audit trail
			await this.#evseRepository.AuditTrail({
				admin_id: data.admin_id,
				cpo_id: null,
				action: "ATTEMPT to REGISTER new EVSE",
				remarks: "failed",
			});
			throw err;
		} finally {
			if (conn) conn.release();
		}
	}

	/**
	 * Binds an Electric Vehicle Supply Equipment (EVSE) to a specified location.
	 *
	 * @async
	 * @function BindEVSE
	 * @param {Object} data - The data required to bind the EVSE.
	 * @param {string} data.admin_id - The ID of the admin performing the bind operation.
	 * @param {string} data.evse_uid - The unique identifier of the EVSE.
	 * @param {string} data.location_id - The unique identifier of the location to bind the EVSE to.
	 * @throws {HttpBadRequest} Throws an error if the binding status is not "SUCCESS".
	 * @returns {Promise<string>} The status of the binding operation.
	 */
	async BindEVSE(data) {
		try {
			const result = await this.#evseRepository.BindEVSE(data);

			const status = result[0][0].STATUS;

			if (status !== "SUCCESS") throw new HttpBadRequest(status, []);

			await this.#evseRepository.AuditTrail({
				admin_id: data.admin_id,
				cpo_id: null,
				action: `BIND EVSE with ID of ${data.evse_uid} to Location with ID of ${data.location_id}`,
				remarks: "success",
			});

			return status;
		} catch (err) {
			await this.#evseRepository.AuditTrail({
				admin_id: data.admin_id,
				cpo_id: null,
				action: `ATTEMPT to BIND EVSE with ID of ${data.evse_uid} to Location with ID of ${data.location_id}`,
				remarks: "failed",
			});
			throw err;
		}
	}

	/**
	 * Unbinds an Electric Vehicle Supply Equipment (EVSE) from a specified location.
	 *
	 * @async
	 * @function UnbindEVSE
	 * @param {Object} data - The data required to unbind the EVSE.
	 * @param {string} data.admin_id - The ID of the admin performing the unbind operation.
	 * @param {string} data.evse_uid - The unique identifier of the EVSE.
	 * @param {string} data.location_id - The unique identifier of the location to unbind the EVSE from.
	 * @throws {HttpBadRequest} Throws an error if the unbinding status is not "SUCCESS".
	 * @returns {Promise<string>} The status of the unbinding operation.
	 */
	async UnbindEVSE(data) {
		try {
			const result = await this.#evseRepository.UnbindEVSE(data);

			const status = result[0][0].STATUS;

			if (status !== "SUCCESS") throw new HttpBadRequest(status, []);

			await this.#evseRepository.AuditTrail({
				admin_id: data.admin_id,
				cpo_id: null,
				action: `UNBIND EVSE with ID of ${data.evse_uid} from Location with ID of ${data.location_id}`,
				remarks: "success",
			});
			return status;
		} catch (err) {
			await this.#evseRepository.AuditTrail({
				admin_id: data.admin_id,
				cpo_id: null,
				action: `ATTEMPT to UNBIND EVSE with ID of ${data.evse_uid} from Location with ID of ${data.location_id}`,
				remarks: "failed",
			});
			throw err;
		}
	}

	/**
	 * Retrieves the default payment types and capabilities for EVSEs.
	 *
	 * @async
	 * @function GetDefaultData
	 * @returns {Promise<Object>} An object containing default payment types and capabilities.
	 * @returns {Promise<Array>} returns.payment_types - An array of default payment types.
	 * @returns {Promise<Array>} returns.capabilities - An array of default capabilities.
	 */
	async GetDefaultData() {
		const payment_types = await this.#evseRepository.GetDefaultPaymentTypes();

		const capabilities = await this.#evseRepository.GetDefaultCapabilities();

		const connector_types =
			await this.#evseRepository.GetDefaultConnectorTypes();

		return { payment_types, capabilities, connector_types };
	}

	/**
	 * Searches for Electric Vehicle Supply Equipment (EVSE) records by serial number with pagination.
	 *
	 * @async
	 * @function SearchEVSEBySerialNumber
	 * @param {string} serialNumber - The serial number of the EVSE to search for.
	 * @param {number} limit - The maximum number of records to retrieve.
	 * @param {number} offset - The number of records to skip before starting to retrieve.
	 * @returns {Promise<Object>} The result of the EVSE search operation.
	 */
	async SearchEVSEBySerialNumber(serialNumber, limit, offset) {
		const result = await this.#evseRepository.SearchEVSEBySerialNumber(
			serialNumber,
			limit,
			offset
		);

		return result;
	}
};
