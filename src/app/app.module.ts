import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EditStationComponent } from './edit-station/edit-station.component';
import { FormsModule } from '@angular/forms';
import { EditStopComponent } from './edit-station/edit-stop/edit-stop.component';
import { EditRouteComponent } from './edit-route/edit-route.component';
import { RoutemapComponent } from './routemap/routemap.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { EditSeviceComponent } from './edit-sevice/edit-sevice.component';
import { RangeSliderModule } from './range-slider/range-slider.module';
@NgModule({
  declarations: [
    AppComponent,
    EditStationComponent,
    EditStopComponent,
    EditRouteComponent,
    RoutemapComponent,
    EditSeviceComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    MatTabsModule,
    MatExpansionModule,
    MatToolbarModule,
    MatListModule,
    BrowserAnimationsModule,
    RangeSliderModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
