import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LayoutComponent } from '@shared/layout';
import { StoreHoursApiService, StoreHoursDay } from './services/store-hours-api.service';

/** Index = day_of_week, so DAY_NAMES[0] is Sunday. */
const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

type DayForm = FormGroup<{
  dayOfWeek: FormControl<number>;
  openTime: FormControl<string>;
  closeTime: FormControl<string>;
  isClosed: FormControl<boolean>;
}>;

@Component({
  selector: 'app-store-hours',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LayoutComponent],
  templateUrl: './store-hours.component.html',
})
export class StoreHoursComponent implements OnInit {
  protected readonly dayNames = DAY_NAMES;

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // One group per weekday, always seven, ordered Sunday -> Saturday.
  protected readonly hoursForm = new FormGroup({
    days: new FormArray<DayForm>([]),
  });

  private readonly api = inject(StoreHoursApiService);

  get daysArray(): FormArray<DayForm> {
    return this.hoursForm.controls.days;
  }

  async ngOnInit(): Promise<void> {
    await this.loadHours();
  }

  private buildDayGroup(day: StoreHoursDay): DayForm {
    const group: DayForm = new FormGroup({
      dayOfWeek: new FormControl(day.day_of_week, { nonNullable: true }),
      openTime: new FormControl(day.open_time, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      closeTime: new FormControl(day.close_time, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      isClosed: new FormControl(day.is_closed, { nonNullable: true }),
    });

    // A closed day's time inputs are irrelevant — disable so they can't block submit.
    if (day.is_closed) {
      group.controls.openTime.disable();
      group.controls.closeTime.disable();
    }

    return group;
  }

  private async loadHours(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const res = await this.api.getStoreHours();
      const byDay = new Map(res.days.map((d) => [d.day_of_week, d]));

      this.daysArray.clear();
      // Render all seven days even if the table is missing rows.
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const existing = byDay.get(dayOfWeek) ?? {
          day_of_week: dayOfWeek,
          open_time: '09:00',
          close_time: '18:00',
          is_closed: false,
        };
        this.daysArray.push(this.buildDayGroup(existing));
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load store hours.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected onClosedToggle(index: number, event: Event): void {
    const isClosed = (event.target as HTMLInputElement).checked;
    const group = this.daysArray.at(index);
    group.controls.isClosed.setValue(isClosed);

    if (isClosed) {
      group.controls.openTime.disable();
      group.controls.closeTime.disable();
    } else {
      group.controls.openTime.enable();
      group.controls.closeTime.enable();
    }
  }

  /** True when an open day's close time is not after its open time. */
  protected isInvalidRange(index: number): boolean {
    const group = this.daysArray.at(index);
    const { isClosed, openTime, closeTime } = group.getRawValue();
    if (isClosed) return false;
    if (!openTime || !closeTime) return false;
    return closeTime <= openTime;
  }

  protected hasAnyInvalidRange(): boolean {
    return this.daysArray.controls.some((_, i) => this.isInvalidRange(i));
  }

  protected async onSubmit(): Promise<void> {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.hoursForm.invalid || this.hasAnyInvalidRange()) {
      this.hoursForm.markAllAsTouched();
      this.errorMessage.set('Please fix the highlighted days before saving.');
      return;
    }

    this.isSaving.set(true);

    // getRawValue() so disabled (closed-day) controls are still included.
    const payload: StoreHoursDay[] = this.daysArray.controls.map((group) => {
      const value = group.getRawValue();
      return {
        day_of_week: value.dayOfWeek,
        open_time: value.openTime,
        close_time: value.closeTime,
        is_closed: value.isClosed,
      };
    });

    try {
      await this.api.updateStoreHours(payload);
      this.successMessage.set('Store hours saved.');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'An error occurred while saving.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
