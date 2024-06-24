const ReportsRepository = require("../repository/ReportsRepository");

module.exports = class ReportsService {
	#repository;

	constructor() {
		this.#repository = new ReportsRepository();
	}

	/**
	 * Retrieves and compiles various metrics for the dashboard.
	 *
	 * This function fetches data from multiple repository methods to get a comprehensive
	 * set of metrics including total CPOs, RFID information, EVSE data, total locations,
	 * and topup sales data. The results are returned as a consolidated object.
	 *
	 * @async
	 * @function GetDashboardData
	 * @returns {Promise<Object>} A promise that resolves to an object containing various dashboard metrics.
	 * @property {number} total_cpos - The total number of CPOs.
	 * @property {Object} rfid_info - Information about RFIDs including total assigned, unassigned, and total RFIDs.
	 * @property {Object} evse_info - Information about EVSEs including total assigned, unassigned, and total EVSEs.
	 * @property {Object} location_info - Information about locations including total assigned, unassigned, and total locations.
	 * @property {Object} topup_info - Information about topups including total sales, voided topups, and categorized sales by payment type.
	 * @throws {Error} If an error occurs during the data retrieval process.
	 */
	async GetDashboardData() {
		const totalCPOs = await this.#repository.GetTotalCPOs();
		const rfidData = await this.#repository.GetTotalRFIDs();
		const evsesData = await this.#repository.GetTotalEVSEs();
		const totalLocations = await this.#repository.GetTotalLocations();
		const topupSales = await this.#repository.GetTotalTopups();

		return {
			total_cpos: totalCPOs[0].total_cpos,
			rfid_info: { ...rfidData[0] },
			evse_info: { ...evsesData[0] },
			location_info: { ...totalLocations[0] },
			topup_info: { ...topupSales[0] },
		};
	}
};
