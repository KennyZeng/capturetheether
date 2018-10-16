pragma solidity ^0.4.21;

import "./FuzzyIdentityChallenge.sol";

contract FuzzyIdentitySolution {
  bytes32 public name = "smarx";

  function solve(address _contract) public {
    FuzzyIdentityChallenge(_contract).authenticate();
  }
}
