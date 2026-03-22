// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SmartTipToken
 * @notice ERC-20 token for SmartTip testing on Sepolia.
 * @dev Initial supply is fixed here for easy auditing.
 */
contract SmartTipToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // 1,000,000 STT initially minted to admin.
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;
    // Hard cap at 10,000,000 STT.
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10 ** 18;

    constructor(address admin) ERC20("SmartTip Token", "STT") {
        require(admin != address(0), "admin is zero address");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        _mint(admin, INITIAL_SUPPLY);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "max supply exceeded");
        _mint(to, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
