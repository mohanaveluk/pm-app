import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ContactRequest, ContactResponse } from './contact.model';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly api = inject(ApiService);

  createContact(payload: ContactRequest): Observable<ContactResponse> {
    return this.api.createContact(payload);
  }
}
