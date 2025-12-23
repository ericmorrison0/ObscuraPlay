// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ObscuraPlay
/// @notice A 9x9 grid game where each player's position is stored encrypted on-chain.
/// @dev All decrypted values are computed off-chain via the Zama Relayer SDK.
/// @author ObscuraPlay
contract ObscuraPlay is ZamaEthereumConfig {
    /// @notice Map size on each axis (coordinates are 1..MAP_SIZE).
    uint8 public constant MAP_SIZE = 9;

    struct Player {
        bool joined;
        uint256 index;
        euint8 x;
        euint8 y;
        eaddress encryptedAddress;
    }

    mapping(address player => Player playerData) private _players;
    eaddress[] private _playerEncryptedAddresses;

    error AlreadyJoined();
    error NotJoined();

    /// @notice Emitted when a player joins and is assigned a random encrypted position.
    /// @param playerIndex The player's index in the encrypted address list.
    event PlayerJoined(uint256 indexed playerIndex);

    /// @notice Emitted when a player updates their encrypted position.
    /// @param playerIndex The player's index in the encrypted address list.
    event PlayerMoved(uint256 indexed playerIndex);

    /// @notice Emitted when a player makes their encrypted address publicly decryptable.
    /// @param playerIndex The player's index in the encrypted address list.
    event PlayerAddressMadePublic(uint256 indexed playerIndex);

    /// @notice Returns whether a given address has joined the game.
    /// @param player The player address to query.
    /// @return True if the player has joined, false otherwise.
    function hasJoined(address player) external view returns (bool) {
        return _players[player].joined;
    }

    /// @notice Returns the number of players that have joined.
    /// @return The number of players.
    function getPlayerCount() external view returns (uint256) {
        return _playerEncryptedAddresses.length;
    }

    /// @notice Returns the encrypted player address handle stored at an index.
    /// @param index The player index.
    /// @return The encrypted address handle.
    function getEncryptedPlayerAddressByIndex(uint256 index) external view returns (eaddress) {
        return _playerEncryptedAddresses[index];
    }

    /// @notice Returns the encrypted address handle for a player.
    /// @param player The player address to query.
    /// @return The encrypted address handle.
    function getPlayerEncryptedAddress(address player) external view returns (eaddress) {
        return _players[player].encryptedAddress;
    }

    /// @notice Returns the encrypted (x,y) position handles for a player.
    /// @param player The player address to query.
    /// @return x The encrypted x coordinate handle.
    /// @return y The encrypted y coordinate handle.
    function getPlayerPosition(address player) external view returns (euint8 x, euint8 y) {
        Player storage p = _players[player];
        return (p.x, p.y);
    }

    /// @notice Join the game and receive a random encrypted position on the 9x9 grid.
    function join() external {
        Player storage p = _players[msg.sender];
        if (p.joined) revert AlreadyJoined();

        euint8 randomX = FHE.randEuint8();
        euint8 randomY = FHE.randEuint8();

        p.joined = true;
        p.x = FHE.add(FHE.rem(randomX, MAP_SIZE), 1);
        p.y = FHE.add(FHE.rem(randomY, MAP_SIZE), 1);
        p.encryptedAddress = FHE.asEaddress(msg.sender);

        _playerEncryptedAddresses.push(p.encryptedAddress);
        uint256 playerIndex = _playerEncryptedAddresses.length - 1;
        p.index = playerIndex;

        FHE.allowThis(p.x);
        FHE.allow(p.x, msg.sender);
        FHE.allowThis(p.y);
        FHE.allow(p.y, msg.sender);
        FHE.allowThis(p.encryptedAddress);
        FHE.allow(p.encryptedAddress, msg.sender);

        emit PlayerJoined(playerIndex);
    }

    /// @notice Move to another tile. The new (x,y) is provided as encrypted inputs.
    /// @dev The coordinates are canonicalized to the range [1..9] by applying modulo 9 and adding 1.
    /// @param xInput Encrypted x coordinate.
    /// @param yInput Encrypted y coordinate.
    /// @param inputProof Proof for the encrypted inputs.
    function jump(externalEuint8 xInput, externalEuint8 yInput, bytes calldata inputProof) external {
        Player storage p = _players[msg.sender];
        if (!p.joined) revert NotJoined();

        euint8 xRaw = FHE.fromExternal(xInput, inputProof);
        euint8 yRaw = FHE.fromExternal(yInput, inputProof);

        p.x = FHE.add(FHE.rem(xRaw, MAP_SIZE), 1);
        p.y = FHE.add(FHE.rem(yRaw, MAP_SIZE), 1);

        FHE.allowThis(p.x);
        FHE.allow(p.x, msg.sender);
        FHE.allowThis(p.y);
        FHE.allow(p.y, msg.sender);

        emit PlayerMoved(p.index);
    }

    /// @notice Make the caller's encrypted address publicly decryptable.
    function makeMyAddressPublic() external {
        Player storage p = _players[msg.sender];
        if (!p.joined) revert NotJoined();

        FHE.makePubliclyDecryptable(p.encryptedAddress);
        emit PlayerAddressMadePublic(p.index);
    }
}
