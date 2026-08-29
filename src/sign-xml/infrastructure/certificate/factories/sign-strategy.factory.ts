import { UnknownSignStrategyError } from "../../errors";
import { SignStrategy } from "../../interfaces";
import {
  BancoCentralStrategy,
  SecurityDataStrategy,
  UanatacaStrategy,
} from "../strategies";
import { AnfacStrategy } from "../strategies/anfac.strategy";
import { FirmaSeguraStrategy } from "../strategies/firma-segura.strategy";

export class SignStrategyFactory {
  private readonly strategies: SignStrategy[] = [
    new BancoCentralStrategy(),
    new SecurityDataStrategy(),
    new UanatacaStrategy(),
    new AnfacStrategy(),
    new FirmaSeguraStrategy(),
  ];

  getStrategy(friendlyName: string): SignStrategy {
    const strategy = this.strategies.find((s) => s.supports(friendlyName));
    if (!strategy) {
      throw new UnknownSignStrategyError(friendlyName);
    }
    return strategy;
  }
}
