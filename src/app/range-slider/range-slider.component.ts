import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-range-slider',
  templateUrl: './range-slider.component.html',
  styleUrls: ['./range-slider.component.scss'],
})
export class RangeSliderComponent implements OnInit {
  @Input() length: number = 0;
  @Input() start: number = 0;
  @Input() end: number = 0;
  private startThumb: HTMLElement = null;
  private endThumb: HTMLElement = null;
  private itemHeight = 16;

  constructor() {}

  ngOnInit() {
    this.startThumb = document.getElementById('thumb-start');
    this.endThumb = document.getElementById('thumb-end');
    this.updatePosition();
  }
  updatePosition() {
    this.startThumb.style.top = this.start * this.itemHeight + 'px';
    this.endThumb.style.top = this.end * this.itemHeight + 'px';
  }
}
