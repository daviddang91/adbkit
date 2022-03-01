import Fs from 'fs';
import Stream from 'stream';
import Promise from 'bluebird';
import Sinon from 'sinon';
import Chai, { expect, assert } from 'chai';
import simonChai from 'sinon-chai';
Chai.use(simonChai);
import Adb from '../../src/adb';
import Sync, { ENOENT } from '../../src/adb/sync';
import Stats from '../../src/adb/sync/stats';
import Entry from '../../src/adb/sync/entry';
import PushTransfer from '../../src/adb/sync/pushtransfer';
import PullTransfer from '../../src/adb/sync/pulltransfer';
import MockConnection from '../mock/connection';
import Client from '../../src/adb/client';
import Device from '../../src/Device';

// This test suite is a bit special in that it requires a connected Android
// device (or many devices). All will be tested.
describe('Sync', function () {
    // By default, skip tests that require a device.
    let dt = xit;
    if (process.env.RUN_DEVICE_TESTS) {
        dt = it;
    }
    const SURELY_EXISTING_FILE = '/system/build.prop';
    const SURELY_EXISTING_PATH = '/';
    const SURELY_NONEXISTING_PATH = '/non-existing-path';
    const SURELY_WRITABLE_FILE = '/data/local/tmp/_sync.test';
    let client!: Client;
    let deviceList: Device[] | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const forEachSyncDevice = function (iterator: (sync: Sync) => any): Promise<any> {
        assert(deviceList.length > 0, 'At least one connected Android device is required');
        const promises = deviceList.map(async function (device) {
            const sync = await client
                .getDevice(device.id)
                .syncService();
            expect(sync).to.be.an.instanceof(Sync);
            try {
                return await Promise.cast(iterator(sync));
            } finally {
                return sync.end();
            }
        });
        return Promise.all(promises);
            //.then(() => done())
            // .catch(done);
    };
    before(async function () {
        client = Adb.createClient();
        const devices = await client.listDevices();
        deviceList = devices;
    });
    describe('end()', function () {
        return it('should end the sync connection', function () {
            const conn = new MockConnection();
            const sync = new Sync(conn);
            Sinon.stub(conn, 'end');
            sync.end();
            return expect(conn.end).to.have.been.called;
        });
    });
    describe('push(contents, path[, mode])', function () {
        it('should call pushStream when contents is a Stream', function () {
            const conn = new MockConnection();
            const sync = new Sync(conn);
            const stream = new Stream.PassThrough();
            Sinon.stub(sync, 'pushStream');
            sync.push(stream, 'foo');
            return expect(sync.pushStream).to.have.been.called;
        });
        it('should call pushFile when contents is a String', function () {
            const conn = new MockConnection();
            const sync = new Sync(conn);
            // const stream = new Stream.PassThrough();
            Sinon.stub(sync, 'pushFile');
            sync.push(__filename, 'foo');
            return expect(sync.pushFile).to.have.been.called;
        });
        return it('should return a PushTransfer instance', function () {
            const conn = new MockConnection();
            const sync = new Sync(conn);
            const stream = new Stream.PassThrough();
            const transfer = sync.push(stream, 'foo');
            expect(transfer).to.be.an.instanceof(PushTransfer);
            const ret = transfer.cancel();
            console.log('cancel return ', ret);
            return true;
        });
    });
    describe('pushStream(stream, path[, mode])', function () {
        it('should return a PushTransfer instance', function () {
            const conn = new MockConnection();
            const sync = new Sync(conn);
            const stream = new Stream.PassThrough();
            const transfer = sync.pushStream(stream, 'foo');
            expect(transfer).to.be.an.instanceof(PushTransfer);
            transfer.cancel();
            return true;
        });
        return dt('should be able to push >65536 byte chunks without error', async (done) => {
            forEachSyncDevice(function (sync) {
                return new Promise(function (resolve, reject) {
                    const stream = new Stream.PassThrough();
                    const content = Buffer.alloc(1000000);
                    const transfer = sync.pushStream(stream, SURELY_WRITABLE_FILE);
                    transfer.on('error', reject);
                    transfer.on('end', resolve);
                    stream.write(content);
                    return stream.end();
                });
            }).then(done);
        });
    });
    describe('pull(path)', function () {
        dt('should retrieve the same content pushStream() pushed', function (done) {
            return forEachSyncDevice(function (sync) {
                return new Promise(function (resolve, reject) {
                    const stream = new Stream.PassThrough();
                    const content = 'ABCDEFGHI' + Date.now();
                    const transfer = sync.pushStream(stream, SURELY_WRITABLE_FILE);
                    expect(transfer).to.be.an.instanceof(PushTransfer);
                    transfer.on('error', reject);
                    transfer.on('end', function () {
                        const transfer = sync.pull(SURELY_WRITABLE_FILE);
                        expect(transfer).to.be.an.instanceof(PullTransfer);
                        transfer.on('error', reject);
                        return transfer.on('readable', function () {
                            let chunk;
                            while ((chunk = transfer.read())) {
                                expect(chunk).to.not.be.null;
                                expect(chunk.toString()).to.equal(content);
                                return resolve();
                            }
                        });
                    });
                    stream.write(content);
                    return stream.end();
                });
            },).finally(done);
        });
        dt('should emit error for non-existing files', function (done) {
            return forEachSyncDevice(function (sync) {
                return new Promise(function (resolve) {
                    const transfer = sync.pull(SURELY_NONEXISTING_PATH);
                    return transfer.on('error', resolve);
                });
            }).finally(done);
        });
        dt('should return a PullTransfer instance', function (done) {
            return forEachSyncDevice(function (sync) {
                const rval = sync.pull(SURELY_EXISTING_FILE);
                expect(rval).to.be.an.instanceof(PullTransfer);
                return rval.cancel();
            }).finally(done);
        });
        return describe('Stream', function () {
            return dt("should emit 'end' when pull is done", function (done) {
                return forEachSyncDevice(function (sync) {
                    return new Promise(function (resolve, reject) {
                        const transfer = sync.pull(SURELY_EXISTING_FILE);
                        transfer.on('error', reject);
                        transfer.on('end', resolve);
                        return transfer.resume();
                    });
                }).finally(done);
            });
        });
    });
    return describe('stat(path)', function () {
        dt('should return a Promise', function (done) {
            return forEachSyncDevice(function (sync) {
                const rval = sync.stat(SURELY_EXISTING_PATH);
                expect(rval).to.be.an.instanceof(Promise);
                return rval;
            }).finally(done);
        });
        dt('should call with an ENOENT error if the path does not exist', function (done) {
            return forEachSyncDevice(async function (sync) {
                try {
                    await sync.stat(SURELY_NONEXISTING_PATH);
                    throw new Error('Should not reach success branch');
                } catch (e) {
                    const err = e as ENOENT;
                    expect(err).to.be.an.instanceof(Error);
                    expect(err.code).to.equal('ENOENT');
                    expect(err.errno).to.equal(34);
                    return expect(err.path).to.equal(SURELY_NONEXISTING_PATH);
                }
            }).finally(done);
        });
        dt('should call with an fs.Stats instance for an existing path', function (done) {
            return forEachSyncDevice(async function (sync) {
                const stats = await sync.stat(SURELY_EXISTING_PATH);
                return expect(stats).to.be.an.instanceof(Fs.Stats);
            }).finally(done);
        });
        describe('Stats', function () {
            it('should implement Fs.Stats', function (done) {
                expect(new Stats(0, 0, 0)).to.be.an.instanceof(Fs.Stats);
                done();
            });
            dt('should set the `.mode` property for isFile() etc', function (done) {
                return forEachSyncDevice(async function (sync) {
                    const stats = await sync.stat(SURELY_EXISTING_FILE);
                    expect(stats).to.be.an.instanceof(Fs.Stats);
                    expect(stats.mode).to.be.above(0);
                    expect(stats.isFile()).to.be.true;
                    return expect(stats.isDirectory()).to.be.false;
                }).finally(done);
            });
            dt('should set the `.size` property', function (done) {
                return forEachSyncDevice(async function (sync) {
                    const stats = await sync.stat(SURELY_EXISTING_FILE);
                    expect(stats).to.be.an.instanceof(Fs.Stats);
                    expect(stats.isFile()).to.be.true;
                    return expect(stats.size).to.be.above(0);
                }).finally(done);
            });
            return dt('should set the `.mtime` property', function (done) {
                return forEachSyncDevice(async function (sync) {
                    const stats = await sync.stat(SURELY_EXISTING_FILE);
                    expect(stats).to.be.an.instanceof(Fs.Stats);
                    return expect(stats.mtime).to.be.an.instanceof(Date);
                }).finally(done);
            });
        });
        return describe('Entry', function () {
            it('should implement Stats', function (done) {
                expect(new Entry('foo', 0, 0, 0)).to.be.an.instanceof(Stats);
                done();
            });
            dt('should set the `.name` property', function (done) {
                return forEachSyncDevice(async function (sync) {
                    const files = await sync.readdir(SURELY_EXISTING_PATH);
                    expect(files).to.be.an('Array');
                    return files.forEach(function (file) {
                        expect(file.name).to.not.be.null;
                        return expect(file).to.be.an.instanceof(Entry);
                    });
                }).finally(done);
            });
            return dt('should set the Stats properties', function (done) {
                return forEachSyncDevice(async function (sync) {
                    const files = await sync.readdir(SURELY_EXISTING_PATH);
                    expect(files).to.be.an('Array');
                    return files.forEach(function (file) {
                        expect(file.mode).to.not.be.null;
                        expect(file.size).to.not.be.null;
                        return expect(file.mtime).to.not.be.null;
                    });
                }).finally(done);
            });
        });
    });
});
