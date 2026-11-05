import { getOne, putOne, deleteOne } from './db.js';

export async function savePhoto(photo) {
  await putOne('photos', photo);
  return photo;
}

export async function getPhoto(id) {
  return getOne('photos', id);
}

export async function deletePhoto(id) {
  return deleteOne('photos', id);
}
