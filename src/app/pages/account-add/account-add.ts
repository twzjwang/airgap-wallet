import { Component } from '@angular/core'
import { Router } from '@angular/router'
import { Platform } from '@ionic/angular'
import { ICoinProtocol, supportedProtocols } from 'airgap-coin-lib'
import { SubProtocolType } from 'airgap-coin-lib/dist/protocols/ICoinSubProtocol'
import { NetworkType } from 'airgap-coin-lib/dist/utils/ProtocolNetwork'
import { LedgerService } from 'src/app/services/ledger/ledger-service'

import { AccountProvider } from '../../services/account/account.provider'
import { DataService, DataServiceKey } from '../../services/data/data.service'
import { ProtocolsProvider } from '../../services/protocols/protocols'
import { ErrorCategory, handleErrorSentry } from '../../services/sentry-error-handler/sentry-error-handler'
import { AccountImportInteractionType } from '../account-import-interaction-selection/account-import-interaction-selection'

@Component({
  selector: 'page-account-add',
  templateUrl: 'account-add.html',
  styleUrls: ['./account-add.scss']
})
export class AccountAddPage {
  public searchTerm: string = ''
  public supportedAccountProtocols: ICoinProtocol[] = []
  public supportedSubAccountProtocols: ICoinProtocol[] = []
  public filteredAccountProtocols: ICoinProtocol[] = []
  public filteredSubAccountProtocols: ICoinProtocol[] = []

  constructor(
    private readonly platform: Platform,
    private readonly accountProvider: AccountProvider,
    private readonly protocolsProvider: ProtocolsProvider,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly ledgerService: LedgerService
  ) {
    this.supportedAccountProtocols = supportedProtocols()
      .filter((protocol: ICoinProtocol) => protocol.options.network.type === NetworkType.MAINNET)
      .map(coin => coin)
    this.supportedSubAccountProtocols = supportedProtocols()
      .filter((protocol: ICoinProtocol) => protocol.options.network.type === NetworkType.MAINNET)
      .reduce((pv, cv) => {
        if (cv.subProtocols) {
          const subProtocols = cv.subProtocols.filter(
            subProtocol =>
              subProtocol.subProtocolType === SubProtocolType.TOKEN &&
              this.protocolsProvider.getEnabledSubProtocols().indexOf(subProtocol.identifier) >= 0
          )

          return pv.concat(...subProtocols)
        }

        return pv
      }, [])
    this.filterProtocols()
  }

  public searchTermChanged() {
    this.filterProtocols()
  }

  public filterProtocols() {
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase()
    this.filteredAccountProtocols = this.supportedAccountProtocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
    this.filteredSubAccountProtocols = this.supportedSubAccountProtocols.filter(
      protocol => protocol.name.toLowerCase().includes(lowerCaseSearchTerm) || protocol.symbol.toLowerCase().includes(lowerCaseSearchTerm)
    )
  }

  public addAccount(protocol: ICoinProtocol) {
    const isLedgerImportAvailable = this.ledgerService.getSupportedProtocols().includes(protocol.identifier) && this.platform.is('desktop')
    if (!isLedgerImportAvailable) {
      this.importFromVault(protocol)
    } else {
      this.showImportInteractionSelection(protocol)
    }
  }

  public addSubAccount(subProtocol: ICoinProtocol) {
    const mainProtocolIdentifier = subProtocol.identifier.split('-')[0]
    if (
      this.accountProvider
        .getWalletList()
        .filter(
          wallet =>
            wallet.protocol.identifier === mainProtocolIdentifier &&
            wallet.protocol.options.network.identifier === subProtocol.options.network.identifier
        ).length > 0
    ) {
      const info = {
        subProtocolIdentifier: subProtocol.identifier,
        networkIdentifier: subProtocol.options.network.identifier
      }

      this.dataService.setData(DataServiceKey.PROTOCOL, info)
      this.router.navigateByUrl('/sub-account-import/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    } else {
      const info = {
        mainProtocolIdentifier: mainProtocolIdentifier,
        subProtocolIdentifier: subProtocol.identifier,
        networkIdentifier: subProtocol.options.network.identifier
      }

      this.dataService.setData(DataServiceKey.PROTOCOL, info)
      this.router.navigateByUrl('/account-import-onboarding/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
    }
  }

  private showImportInteractionSelection(protocol: ICoinProtocol) {
    const info = {
      callback: (interactionType: AccountImportInteractionType) => {
        switch (interactionType) {
          case AccountImportInteractionType.VAULT:
            this.importFromVault(protocol)
            break
          case AccountImportInteractionType.LEDGER:
            this.importFromLedger(protocol)
            break
          default:
            console.log('Unkonw import interaction type selected.')
        }
      }
    }

    this.dataService.setData(DataServiceKey.INTERACTION, info)
    this.router
      .navigateByUrl(`/account-import-interaction-selection/${DataServiceKey.INTERACTION}`, { skipLocationChange: true })
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private async importFromLedger(protocol: ICoinProtocol): Promise<void> {
    const info = {
      protocolIdentifier: protocol.identifier
    }
    this.dataService.setData(DataServiceKey.PROTOCOL, info)
    this.router
      .navigateByUrl('/account-import-ledger-onboarding/' + DataServiceKey.PROTOCOL)
      .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private importFromVault(protocol: ICoinProtocol) {
    const info = {
      mainProtocolIdentifier: protocol.identifier
    }
    this.dataService.setData(DataServiceKey.PROTOCOL, info)
    this.router.navigateByUrl('/account-import-onboarding/' + DataServiceKey.PROTOCOL).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }
}
