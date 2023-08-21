import { Component, OnInit } from '@angular/core';
import { MetamaskService } from '../services/metamask.service';
import { BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { TextModalComponent } from '../text-modal/text-modal.component';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit {
  constructor(
    public readonly metamaskService: MetamaskService,
    private readonly modalService: BsModalService
  ) {}

  ngOnInit(): void {}

  showModal(type: 'instructions'): void {
    const initialState: ModalOptions<TextModalComponent> = {
      initialState: {
        title: 'header',
        text: type,
        closeBtnName: 'Close',
      },
    };
    const bsModalRef = this.modalService.show(TextModalComponent, initialState);
  }
}
