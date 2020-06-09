import IConfig from './Interfaces/IConfig.ts';

class Config implements IConfig {
    public bytesPerSecond: number = Infinity;
    public ticksPerSecond: number = 40;

    public get isThrottled(): boolean {
        return this.bytesPerSecond < Infinity;
    }

    public get tickDurationMs(): number {
        return 1000 / this.ticksPerSecond;
    }
}

export default Config;
