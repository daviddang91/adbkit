import Chai from 'chai';
import simonChai from 'sinon-chai';
Chai.use(simonChai);
const { expect } = Chai;
import MockConnection from '../../../mock/connection';
import Protocol from '../../../../src/adb/protocol';
import RemountCommand from '../../../../src/adb/command/host-transport/remount';

describe('RemountCommand', function () {
    return it("should send 'remount:'", function (done) {
        const conn = new MockConnection();
        const cmd = new RemountCommand(conn);
        conn.getSocket().on('write', function (chunk) {
            expect(chunk.toString()).to.equal(Protocol.encodeData('remount:').toString());
            conn.getSocket().causeRead(Protocol.OKAY);
            return conn.getSocket().causeEnd();
        });
        return cmd.execute().then(function () {
            return done();
        });
    });
});