const MerchantService = require("../services/MerchantService");
const {
	HttpInternalServerError,
	HttpBadRequest,
} = require("../utils/HttpError");

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
			admin_id: 1,
			cpo_id: null,
			action: `ACTIVATE Charging Point Operator account with id of ${1}`,
			remarks: "success",
		});
	});

	it("should successfully deactivate CPO account", async () => {
		const result = await merchantService.ChangeCPOAccountStatus(
			"deactivate",
			1,
			1
		);

		expect(result).toBe("SUCCESS");
		expect(mockRepository.DeactivateCPOAccount).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 1,
			cpo_id: null,
			action: `DEACTIVATE Charging Point Operator account with id of ${1}`,
			remarks: "success",
		});
		expect(mockRepository.ActivateCPOAccount).toHaveBeenCalledTimes(0);
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
	});

	it("should return NO_CHANGES_APPLIED", async () => {
		mockRepository.ActivateCPOAccount = jest
			.fn()
			.mockResolvedValue({ affectedRows: 0 });

		const result = await merchantService.ChangeCPOAccountStatus(
			"activate",
			1,
			1
		);

		expect(result).toBe("NO_CHANGES_APPLIED");
		expect(mockRepository.ActivateCPOAccount).toHaveBeenCalledTimes(1);
		expect(mockRepository.DeactivateCPOAccount).toHaveBeenCalledTimes(0);
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(0);
	});

	it("should return an error when ACTIVATING CPO account fails", async () => {
		mockRepository.ActivateCPOAccount = jest
			.fn()
			.mockRejectedValue(new HttpInternalServerError());

		try {
			await merchantService.ChangeCPOAccountStatus("activate", 1, 1);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpInternalServerError);
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 1,
				cpo_id: null,
				action: `ATTEMPT to DEACTIVATE Charging Point Operator account`,
				remarks: "failed",
			});
		}
	});

	it("it should return BAD REQUEST when action is invalid", async () => {
		try {
			await merchantService.ChangeCPOAccountStatus("invalid", 1, 1);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 1,
				cpo_id: null,
				action: `ATTEMPT to DEACTIVATE Charging Point Operator account`,
				remarks: "failed",
			});
		}
	});
});
