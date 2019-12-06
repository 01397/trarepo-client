import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditSeviceComponent } from './edit-sevice.component';

describe('EditSeviceComponent', () => {
  let component: EditSeviceComponent;
  let fixture: ComponentFixture<EditSeviceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [EditSeviceComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditSeviceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
