const MerchantService = require("../services/MerchantService");

jest.mock("mysql2", () => {
	const mConnection = {
		release: jest.fn(),
	};
	const mPool = {
		getConnection: jest.fn((callback) => callback(null, mConnection)),
		on: jest.fn(),
	};
	return {
		createPool: jest.fn(() => mPool),
	};
});

const mockRepository = {
	ActivateCPOAccount: jest.fn().mockResolvedValue({ affectedRows: 1 }),
	DeactivateCPOAccount: jest.fn().mockResolvedValue({ affectedRows: 1 }),
	AuditTrail: jest.fn().mockResolvedValue(undefined),
};

describe("Change CPO Account Status", () => {
	/**
	 * @type {MerchantService}
	 */
	let merchantService;

	beforeEach(() => {
		merchantService = new MerchantService(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should successfully activate the CPO account", async () => {
		const result = await merchantService.ChangeCPOAccountStatus(
			"activate",
			1,
			1
		);

		expect(result).toBe("SUCCESS");
		expect(mockRepository.ActivateCPOAccount).toHaveBeenCalledTimes(1);
		expect(mockRepository.DeactivateCPOAccount).toHaveBeenCalledTimes(0);
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id,
			cpo_id: null,
			action: `${
				action === "activate" ? "ACTIVATE" : "DEACTIVATE"
			} Charging Point Operator account with id of ${userID}`,
			remarks: "success",
		});
	});
});
