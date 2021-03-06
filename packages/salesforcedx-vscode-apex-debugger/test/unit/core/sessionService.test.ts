/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfdxCommandBuilder } from '@salesforce/salesforcedx-utils-vscode/out/src/cli';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { SessionService } from '../../../src/core/sessionService';
import { CommandOutput } from '../../../src/utils/commandOutput';
import childProcess = require('child_process');

describe('Debugger session service', () => {
  let service: SessionService;
  const mockSpawn = require('mock-spawn');

  beforeEach(() => {
    service = new SessionService();
  });

  describe('Helpers', () => {
    it('Should detect an Apex Debugger session ID by key prefix', () => {
      expect(service.isApexDebuggerSessionId('07aFAKE')).to.equal(true);
    });

    it('Should not detect an Apex Debugger session ID by key prefix', () => {
      expect(service.isApexDebuggerSessionId('FAKE')).to.equal(false);
    });
  });

  describe('Start', () => {
    let origSpawn: any, mySpawn: any;
    let cmdWithArgSpy: sinon.SinonSpy;
    let cmdWithFlagSpy: sinon.SinonSpy;
    let cmdBuildSpy: sinon.SinonSpy;

    beforeEach(() => {
      origSpawn = childProcess.spawn;
      mySpawn = mockSpawn();
      childProcess.spawn = mySpawn;
      cmdWithArgSpy = sinon.spy(SfdxCommandBuilder.prototype, 'withArg');
      cmdWithFlagSpy = sinon.spy(SfdxCommandBuilder.prototype, 'withFlag');
      cmdBuildSpy = sinon.spy(SfdxCommandBuilder.prototype, 'build');
    });

    afterEach(() => {
      childProcess.spawn = origSpawn;
      cmdWithArgSpy.restore();
      cmdWithFlagSpy.restore();
      cmdBuildSpy.restore();
    });

    it('Should start successfully', async () => {
      mySpawn.setDefault(mySpawn.simple(0, '{"result":{"id":"07aFAKE"}}'));

      const cmdOutput: CommandOutput = await service.start();

      expect(cmdOutput.getStdOut()).to.equal('{"result":{"id":"07aFAKE"}}');
      expect(cmdOutput.getId()).to.equal('07aFAKE');
      expect(service.isConnected()).to.equal(true);
      expect(service.getSessionId()).to.equal('07aFAKE');
    });

    it('Should build command', async () => {
      mySpawn.setDefault(mySpawn.simple(0, '{"result":{"id":"07aFAKE"}}'));

      await service
        .forProject('project')
        .withUserFilter('user')
        .withRequestFilter('request')
        .withEntryFilter('entry')
        .start();

      expect(cmdWithArgSpy.getCall(0).args).to.have.same.members([
        'force:data:record:create'
      ]);
      expect(cmdWithFlagSpy.getCall(0).args).to.have.same.members([
        '--sobjecttype',
        'ApexDebuggerSession'
      ]);
      expect(cmdWithFlagSpy.getCall(1).args).to.have.same.members([
        '--values',
        "UserIdFilter='user' EntryPointFilter='entry' RequestTypeFilter='request'"
      ]);
      expect(cmdWithArgSpy.getCall(1).args).to.have.same.members([
        '--usetoolingapi'
      ]);
      expect(cmdWithArgSpy.getCall(2).args).to.have.same.members(['--json']);
      expect(cmdBuildSpy.calledOnce).to.equal(true);
    });

    it('Should not start successfully with wrong ID', async () => {
      mySpawn.setDefault(mySpawn.simple(0, '{"result":{"id":"FAKE"}}'));

      try {
        await service
          .forProject('project')
          .withUserFilter('user')
          .withRequestFilter('request')
          .withEntryFilter('entrypoint')
          .start();
        expect.fail('Should have failed');
      } catch (error) {
        expect(error).to.equal('{"result":{"id":"FAKE"}}');
        expect(service.isConnected()).to.equal(false);
        expect(service.getSessionId()).to.equal('');
      }
    });

    it('Should not start successfully with unexpected response format', async () => {
      mySpawn.setDefault(mySpawn.simple(0, '{"result":{"notid":"FAKE"}}'));

      try {
        await service.start();
        expect.fail('Should have failed');
      } catch (error) {
        expect(error).to.equal('{"result":{"notid":"FAKE"}}');
        expect(service.isConnected()).to.equal(false);
        expect(service.getSessionId()).to.an('undefined');
      }
    });

    it('Should not start successfully with error message & action', async () => {
      mySpawn.setDefault(
        mySpawn.simple(
          1,
          '',
          '{"message":"There was an error", "action":"Try again"}'
        )
      );

      try {
        await service.start();
        expect.fail('Should have failed');
      } catch (error) {
        expect(error).to.equal(
          '{"message":"There was an error", "action":"Try again"}'
        );
        expect(service.isConnected()).to.equal(false);
        expect(service.getSessionId()).to.an('undefined');
      }
    });
  });

  describe('Stop', () => {
    let origSpawn: any, mySpawn: any;
    let cmdWithArgSpy: sinon.SinonSpy;
    let cmdWithFlagSpy: sinon.SinonSpy;
    let cmdBuildSpy: sinon.SinonSpy;

    beforeEach(() => {
      origSpawn = childProcess.spawn;
      mySpawn = mockSpawn();
      childProcess.spawn = mySpawn;
      cmdWithArgSpy = sinon.spy(SfdxCommandBuilder.prototype, 'withArg');
      cmdWithFlagSpy = sinon.spy(SfdxCommandBuilder.prototype, 'withFlag');
      cmdBuildSpy = sinon.spy(SfdxCommandBuilder.prototype, 'build');
    });

    afterEach(() => {
      childProcess.spawn = origSpawn;
      cmdWithArgSpy.restore();
      cmdWithFlagSpy.restore();
      cmdBuildSpy.restore();
    });

    it('Should stop successfully', async () => {
      mySpawn.setDefault(mySpawn.simple(0, '{"result":{"id":"07aFAKE"}}'));

      const cmdOutput: CommandOutput = await service.stop();

      expect(cmdOutput.getStdOut()).to.equal('{"result":{"id":"07aFAKE"}}');
      expect(cmdOutput.getId()).to.equal('07aFAKE');
      expect(service.isConnected()).to.equal(false);
      expect(service.getSessionId()).to.equal('');
    });

    it('Should build command', async () => {
      mySpawn.setDefault(mySpawn.simple(0, '{"result":{"id":"07aFAKE"}}'));

      await service.start();
      cmdWithArgSpy.reset();
      cmdWithFlagSpy.reset();
      cmdBuildSpy.reset();
      await service.stop();

      expect(cmdWithArgSpy.getCall(0).args).to.have.same.members([
        'force:data:record:update'
      ]);
      expect(cmdWithFlagSpy.getCall(0).args).to.have.same.members([
        '--sobjecttype',
        'ApexDebuggerSession'
      ]);
      expect(cmdWithFlagSpy.getCall(1).args).to.have.same.members([
        '--sobjectid',
        '07aFAKE'
      ]);
      expect(cmdWithFlagSpy.getCall(2).args).to.have.same.members([
        '--values',
        "Status='Detach'"
      ]);
      expect(cmdWithArgSpy.getCall(1).args).to.have.same.members([
        '--usetoolingapi'
      ]);
      expect(cmdWithArgSpy.getCall(2).args).to.have.same.members(['--json']);
      expect(cmdBuildSpy.calledOnce).to.equal(true);
    });

    it('Should not stop successfully with wrong ID', async () => {
      mySpawn.setDefault(mySpawn.simple(0, '{"result":{"id":"FAKE"}}'));

      try {
        await service.stop();
        expect.fail('Should have failed');
      } catch (error) {
        expect(error).to.equal('{"result":{"id":"FAKE"}}');
        expect(service.isConnected()).to.equal(true);
        expect(service.getSessionId()).to.an('undefined');
      }
    });

    it('Should not stop successfully with unexpected response format', async () => {
      mySpawn.setDefault(mySpawn.simple(0, '{"result":{"notid":"FAKE"}}'));

      try {
        await service.stop();
        expect.fail('Should have failed');
      } catch (error) {
        expect(error).to.equal('{"result":{"notid":"FAKE"}}');
        expect(service.isConnected()).to.equal(false);
        expect(service.getSessionId()).to.an('undefined');
      }
    });

    it('Should not stop successfully with error message & action', async () => {
      mySpawn.setDefault(
        mySpawn.simple(
          1,
          '',
          '{"message":"There was an error", "action":"Try again"}'
        )
      );

      try {
        await service.stop();
        expect.fail('Should have failed');
      } catch (error) {
        expect(error).to.equal(
          '{"message":"There was an error", "action":"Try again"}'
        );
        expect(service.isConnected()).to.equal(false);
        expect(service.getSessionId()).to.an('undefined');
      }
    });

    it('Should reset connected status if forced to stop', async () => {
      mySpawn.setDefault(mySpawn.simple(0, '{"result":{"id":"07aFAKE"}}'));

      await service.start();
      service.forceStop();

      expect(service.isConnected()).to.equal(false);
      expect(service.getSessionId()).to.equal('');
    });
  });
});
