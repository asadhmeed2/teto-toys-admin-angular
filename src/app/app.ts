import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionInactivityService } from './shared/services/session-inactivity.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [],
})
export class App {
  private readonly inactivityService = inject(SessionInactivityService);
}
