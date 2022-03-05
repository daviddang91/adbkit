import Command from '../../command';

export default class HostKillCommand extends Command<boolean> {
  async execute(): Promise<boolean> {
    this._send('host:kill');
    const reply = await this.parser.readAscii(4);
    switch (reply) {
      case this.protocol.OKAY:
        return true;
      case this.protocol.FAIL:
        return this.parser.readError();
      default:
        return this.parser.unexpected(reply, 'OKAY or FAIL');
    }
  }
}
