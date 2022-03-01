import Stream, { Transform } from 'stream';
import Sinon from 'sinon';
import Chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
Chai.use(sinonChai);
import Parser from '../../src/adb/parser';
import Tracker from '../../src/adb/tracker';
import Protocol from '../../src/adb/protocol';
import HostTrackDevicesCommand from '../../src/adb/command/host/trackdevices';
import Connection from '../../src/adb/connection';
import { Device } from '../../src';
import Util from '../../src/adb/util';

describe('Tracker', function () {
    let writer: Transform;
    let conn: Connection;
    let cmd: HostTrackDevicesCommand;
    let tracker: Tracker;
    beforeEach(function () {
        writer = new Stream.PassThrough();
        conn = {
            parser: new Parser(writer),
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            end: () => { },
        } as Connection;
        cmd = new HostTrackDevicesCommand(conn);
        tracker = new Tracker(cmd);
    });
    it("should emit 'add' when a device is added", function (done) {
        const spy = Sinon.spy();
        tracker.on('add', spy);
        const device1: Device = { id: 'a', type: 'device' };
        const device2: Device = { id: 'b', type: 'device' };
        tracker.update([device1, device2]);
        expect(spy).to.have.been.calledTwice;
        expect(spy).to.have.been.calledWith(device1);
        expect(spy).to.have.been.calledWith(device2);
        done();
    });
    it("should emit 'remove' when a device is removed", function (done) {
        const spy = Sinon.spy();
        tracker.on('remove', spy);
        const device1: Device = { id: 'a', type: 'device' };
        const device2: Device = { id: 'b', type: 'device' };
        tracker.update([device1, device2]);
        tracker.update([device1]);
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith(device2);
        done();
    });
    it("should emit 'change' when a device changes", function (done) {
        const spy = Sinon.spy();
        tracker.on('change', spy);
        const deviceOld: Device = { id: 'a', type: 'device' };
        const deviceNew: Device = { id: 'a', type: 'offline' };
        tracker.update([deviceOld]);
        tracker.update([deviceNew]);
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith(deviceNew, deviceOld);
        done();
    });
    it("should emit 'changeSet' with all changes", function (done) {
        const spy = Sinon.spy();
        tracker.on('changeSet', spy);
        const device1: Device = { id: 'a', type: 'device' };
        const device2: Device = { id: 'b', type: 'device' };
        const device3: Device = { id: 'c', type: 'device' };
        const device3New: Device = { id: 'c', type: 'offline' };
        const device4: Device = { id: 'd', type: 'offline' };
        tracker.update([device1, device2, device3]);
        tracker.update([device1, device3New, device4]);
        expect(spy).to.have.been.calledTwice;
        expect(spy).to.have.been.calledWith({
            added: [device1, device2, device3],
            changed: [],
            removed: [],
        });
        expect(spy).to.have.been.calledWith({
            added: [device4],
            changed: [device3New],
            removed: [device2],
        });
        done();
    });
    it("should emit 'error' and 'end' when connection ends", (done) => {
        tracker.on('error', () => tracker.on('end', done));
        writer.end();
    });
    it('should read devices from socket', async () => {
        const spy = Sinon.spy();
        tracker.on('changeSet', spy);
        const device1: Device = { id: 'a', type: 'device' };
        const device2: Device = { id: 'b', type: 'device' };
        const device3: Device = { id: 'c', type: 'device' };
        const device3New: Device = { id: 'c', type: 'offline' };
        const device4: Device = { id: 'd', type: 'offline' };
        writer.write(
            Protocol.encodeData(`a\tdevice
b\tdevice
c\tdevice`),
        );
        writer.write(
            Protocol.encodeData(`a\tdevice
c\toffline
d\toffline`),
        );
        await Util.delay(10)
        expect(spy).to.have.been.calledTwice;
        expect(spy).to.have.been.calledWith({
            added: [device1, device2, device3],
            changed: [],
            removed: [],
        });
        expect(spy).to.have.been.calledWith({
            added: [device4],
            changed: [device3New],
            removed: [device2],
        });
        return true;
    });
    // broken test
    return describe('end()', () => {
        it('should close the connection', (done) => {
            Sinon.spy(conn.parser, 'end');
            tracker.on('end', () => {
                expect(conn.parser.end).to.have.been.calledOnce;
                done();
            });
            tracker.end();
        });
        return it('should not cause an error to be emit', function (done) {
            const spy = Sinon.spy();
            tracker.on('error', spy);
            tracker.on('end', function () {
                expect(spy).to.not.have.been.called;
                done();
            });
            tracker.end();
        });
    });
});
