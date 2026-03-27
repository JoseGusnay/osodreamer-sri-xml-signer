import { UnknownSignStrategyError } from "../../errors";
import { SignStrategy } from "../../interfaces";
import {
  BancoCentralStrategy,
  SecurityDataStrategy,
  UanatacaStrategy,
} from "../strategies";
import { AnfacStrategy } from "../strategies/anfac.strategy";
import { CorpnewbestStrategy } from "../strategies/corpnewbest.strategy";
import { FirmaseguraStrategy } from "../strategies/firmasegura.strategy";
import { LazzateStrategy } from "../strategies/lazzate.strategy";

export class SignStrategyFactory {
  private readonly strategies: SignStrategy[] = [
    new BancoCentralStrategy(),
    new SecurityDataStrategy(),
    new UanatacaStrategy(),
    new AnfacStrategy(),
    new CorpnewbestStrategy(),
    new FirmaseguraStrategy(),
    new LazzateStrategy(),
  ];

  getStrategy(friendlyName: string): SignStrategy {
    const strategy = this.strategies.find((s) => s.supports(friendlyName));
    if (!strategy) {
      throw new UnknownSignStrategyError(friendlyName);
    }
    return strategy;
  }
}
