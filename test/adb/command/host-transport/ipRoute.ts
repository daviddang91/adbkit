import Chai from 'chai';
import simonChai from 'sinon-chai';
Chai.use(simonChai);
import { IpRouteCommand } from '../../../../src/adb/command/host-transport';
import getTester from './commonTest';

const {testTr, testPr} = getTester(IpRouteCommand);

describe('ipRouteCommand', function () {
    it("should send 'ip route'", () => testTr('shell:ip route'));

    it("should send 'ip route list table all'", () => testTr('shell:ip route list table all', 'list table all'));

    it("should send 'ip route list table all' split", () => testTr('shell:ip route list table all', 'list', 'table', 'all'));

    it('should return a list of routes', () => testPr(
        `192.168.1.0/24 dev wlan0 proto kernel scope link src 192.168.1.2\n`,
        [{ dest: '192.168.1.0/24', dev: 'wlan0', proto: 'kernel', scope: 'link', src: '192.168.1.2' }],
    ));

    it('should return convert number string to numbers', () => testPr(
        `fe80::/64 dev wlan0 table 1021 proto kernel metric 256 pref medium\n`,
        [{ dest: 'fe80::/64', dev: 'wlan0', table: 1021, proto: 'kernel', metric: 256, pref: 'medium' }]
    ));
});
