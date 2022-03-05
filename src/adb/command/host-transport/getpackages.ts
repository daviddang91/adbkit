import Command from '../../command';

export default class GetPackagesCommand extends Command<string[]> {
  async execute(flags?: string): Promise<string[]> {
    if (flags) {
      this._send(`shell:pm list packages ${flags} 2>/dev/null`);
    } else {
      this._send('shell:pm list packages 2>/dev/null');
    }
    const reply = await this.parser.readAscii(4);
    switch (reply) {
      case this.protocol.OKAY:
        const data = await this.parser.readAll();
        return this._parsePackages(data.toString());
      case this.protocol.FAIL:
        return this.parser.readError();
      default:
        return this.parser.unexpected(reply, 'OKAY or FAIL');
    }
  }

  private _parsePackages(value: string): string[] {
    const packages: string[] = [];
    const RE_PACKAGE = /^package:(.*?)\r?$/gm;
    for (;;) {
      const match = RE_PACKAGE.exec(value);
      if (match) {
        packages.push(match[1]);
      } else {
        break;
      }
    }
    return packages;
  }
}
