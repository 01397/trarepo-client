import { Component, OnInit } from '@angular/core';
import { JPTI } from 'src/lib/JPTI/JPTI';
import Service = JPTI.Service;

@Component({
  selector: 'app-edit-sevice',
  templateUrl: './edit-sevice.component.html',
  styleUrls: ['./edit-sevice.component.scss'],
})
export class EditSeviceComponent implements OnInit {
  /**
   * 編集対象の系統
   */
  public service: Service = null;

  constructor() {}

  ngOnInit() {}
}
