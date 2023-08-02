import { PeerInfo, PermissionInfo } from '@airgap/beacon-types';
import { Component, OnInit } from '@angular/core';
import { BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { AccountsOverviewComponent } from './components/accounts-overview/accounts-overview.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { HowToModalComponent } from './components/how-to-modal/how-to-modal.component';
import { LoadingModalComponent } from './components/loading-modal/loading-modal.component';
import { NodeSelectorModalComponent } from './components/node-selector-modal/node-selector-modal.component';
import { Account, AccountService } from './services/account.service';
import { ApiService } from './services/api.service';
import { BeaconService, LogAction } from './services/beacon.service';
import { NavigationEnd, Router } from '@angular/router';
import { TabSyncService } from './services/tab-sync.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  balance: string = '0';
  address: string = '';
  operations: {
    hash: string;
    amount: number;
    sender: { address: string };
    target: { address: string };
    timestamp: string;
  }[] = [];

  isCollapsed = true;

  syncCode: string = '';

  connected: boolean = false;

  accounts$: Observable<Account[]>;

  peersAndPermissions: [PeerInfo, PermissionInfo[]][] = [];

  selectedNodes: [string, string][] = [];

  constructor(
    public readonly api: ApiService,
    public readonly beacon: BeaconService,
    private readonly accountService: AccountService,
    private readonly modalService: BsModalService,
    private readonly router: Router,
    private readonly tabSyncService: TabSyncService
  ) {
    this.accounts$ = this.accountService.accounts$;
    this.loadNodes();
    this.router.events.subscribe(async (event) => {
      if (event instanceof NavigationEnd) {
        const url = `https://placeholder.com/${event.url}`;
        if (url.includes('?type=tzip10&data=')) {
          console.log('xxx', url);

          // Deeplink handler for beacon
          const params: URLSearchParams = new URL(url).searchParams;
          const payload = params.get('data');
          if (payload) {
            console.log('ADDING PEER');
            await this.beacon.addPeer(payload);
            this.router.navigate(['/']);
          }
        }
      }
    });

    setInterval(() => {
      this.loadAccountInfo();
    }, 10000);
    this.loadAccountInfo();
  }

  loadAccountInfo() {
    this.accountService.accounts$.pipe(first()).subscribe(async (accounts) => {
      if (accounts[0]) {
        this.address = accounts[0].address;
        this.balance = (await this.api.getBalanceOfAddress(accounts[0].address))
          .shiftedBy(-6)
          .toString(10);
        this.operations = (await this.api.getTransactionHistory(
          accounts[0].address
        )) as any;
        console.log('BALANCE: ', this.balance);
        console.log('TXs: ', this.operations);
      }
    });
  }

  loadNodes() {
    this.selectedNodes = Object.entries(this.api.RPCs)
      .filter((element) => element[1].all.length > 0)
      .map((element) => [element[0], element[1].selected]);
  }

  async ngOnInit() {
    this.connected = await this.beacon.walletClient.isConnected;
    this.getPeers();
  }

  async paste() {
    navigator.clipboard.readText().then(async (clipText) => {
      try {
        this.syncCode = clipText;
      } catch {}
    });
  }
  async connect() {
    const bsModalRef = this.modalService.show(LoadingModalComponent, {});

    setTimeout(() => {
      this.beacon.addPeer(this.syncCode).finally(() => bsModalRef.hide());
    }, 500);
  }

  async getPeers() {
    const peers = await this.beacon.walletClient.getPeers();
    const permissions = await this.beacon.walletClient.getPermissions();

    this.peersAndPermissions = peers.map((peer) => {
      return [
        peer,
        permissions.filter((perm) => perm.senderId === (peer as any).senderId),
      ];
    });
  }

  async removePeer(peer: PeerInfo) {
    const bsModalRef = this.modalService.show(ConfirmModalComponent, {});

    bsModalRef.onHide?.pipe(first()).subscribe(async (result) => {
      if (result === 'confirm') {
        await this.beacon.walletClient.removePeer(peer as any, true);
        this.getPeers();
      }
    });
  }

  async removePermission(permission: PermissionInfo) {
    const bsModalRef = this.modalService.show(ConfirmModalComponent, {});

    bsModalRef.onHide?.pipe(first()).subscribe(async (result) => {
      if (result === 'confirm') {
        await this.beacon.walletClient.removePermission(
          permission.accountIdentifier
        );
        this.getPeers();
      }
    });
  }

  async removeAccount(account: Account) {
    const bsModalRef = this.modalService.show(ConfirmModalComponent, {});

    bsModalRef.onHide?.pipe(first()).subscribe((result) => {
      if (result === 'confirm') {
        this.accountService.removeAccount(account);
      }
    });
  }

  async openAccountsOverview() {
    const initialState: ModalOptions = {
      initialState: {},
    };
    const bsModalRef = this.modalService.show(
      AccountsOverviewComponent,
      initialState
    );
    (bsModalRef.content as any).closeBtnName = 'Close';
  }

  openNodeSelectorModal() {
    const initialState: ModalOptions = {
      initialState: {},
    };
    const bsModalRef = this.modalService.show(
      NodeSelectorModalComponent,
      initialState
    );
    bsModalRef.onHide?.subscribe(() => {
      this.loadNodes();
    });
  }

  openHowToModal() {
    const initialState: ModalOptions = {
      initialState: {},
    };
    const bsModalRef = this.modalService.show(
      HowToModalComponent,
      initialState
    );
    (bsModalRef.content as any).closeBtnName = 'Close';
  }

  action(ev: Event, logItem: any, item: LogAction) {
    ev.preventDefault();
    ev.stopPropagation();
    item.action();
    logItem[3].length = 0;
  }
}
